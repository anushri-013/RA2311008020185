\# Notification System Design



\## Stage 1

\### REST API Endpoints



\*\*GET /api/notifications\*\* — Fetch all notifications for logged-in user

Headers: `Authorization: Bearer <token>`

Response:

```json

{ "notifications": \[{ "id": "uuid", "type": "Placement", "message": "...", "isRead": false, "createdAt": "..." }] }

```



\*\*PATCH /api/notifications/:id/read\*\* — Mark notification as read

Response: `{ "success": true }`



\*\*DELETE /api/notifications/:id\*\* — Delete a notification

Response: `{ "success": true }`



\*\*Real-time:\*\* Use WebSockets (Socket.io). Server emits `new\_notification` event to student's room when triggered.



\---



\## Stage 2

\*\*DB Choice:\*\* PostgreSQL — structured data, supports indexing, ACID compliant.



\*\*Schema:\*\*

```sql

CREATE TABLE students (id SERIAL PRIMARY KEY, name VARCHAR, email VARCHAR UNIQUE);

CREATE TABLE notifications (

&#x20; id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; student\_id INT REFERENCES students(id),

&#x20; type VARCHAR CHECK (type IN ('Placement','Result','Event')),

&#x20; message TEXT,

&#x20; is\_read BOOLEAN DEFAULT false,

&#x20; created\_at TIMESTAMP DEFAULT NOW()

);

```

\*\*Scaling issues:\*\* Table grows huge → slow queries. Fix: Add indexes, partition by date, archive old records.



\---



\## Stage 3

\*\*Is the query accurate?\*\* Yes, logically correct but slow.

\*\*Why slow?\*\* No index on (studentID, isRead, createdAt) — does full table scan on 5M rows.

\*\*Fix:\*\*

```sql

CREATE INDEX idx\_notifications\_student\_unread

ON notifications (student\_id, is\_read, created\_at DESC);

```

\*\*Indexing every column:\*\* Bad idea. Indexes slow down INSERT/UPDATE and waste disk space.



\*\*Placement notifications last 7 days:\*\*

```sql

SELECT \* FROM students s

JOIN notifications n ON s.id = n.student\_id

WHERE n.type = 'Placement'

AND n.created\_at >= NOW() - INTERVAL '7 days';

```



\---



\## Stage 4

\*\*Solution:\*\* Cache unread notifications in Redis with key `student:<id>:notifications`.

\- On login: load from Redis, fallback to DB

\- On new notification: update Redis cache

\- TTL: 5 minutes

\*\*Tradeoffs:\*\* Redis is fast but may serve slightly stale data. Acceptable for notifications.



\---



\## Stage 5

\*\*Problems with current pseudocode:\*\*

\- Sequential loop — too slow for 50,000 students

\- No retry on failure

\- Not atomic — email sent but DB save may fail



\*\*Fix:\*\* Use a message queue (BullMQ). Push all student IDs to queue. Workers process in parallel with retry logic.



\*\*Should DB save and email happen together?\*\* No. Use eventual consistency — save to DB first (source of truth), then emit email job to queue. If email fails, retry from queue without data loss.



\*\*Revised pseudocode:\*\*
function notify\_all(student\_ids, message):

&#x20; for student\_id in student\_ids:

&#x20;   queue.push({ student\_id, message })  // fast, non-blocking



worker processes queue:

&#x20; job = queue.pop()

&#x20; save\_to\_db(job.student\_id, job.message)  // DB first



&#x20; retry(3):

&#x20;   send\_email(job.student\_id, job.message)



&#x20; push\_to\_app(job.student\_id, job.message)



\---



\## Stage 6

\*\*Approach:\*\* Min-heap of size N. Score = type weight (Placement=3, Result=2, Event=1) × 10^12 + timestamp\_ms.



\- New notifications pushed into heap

\- If heap size exceeds N → remove smallest (least important/oldest)

\- Ensures top N most relevant notifications are kept



\*\*Why this works:\*\*

\- Efficient → O(log N)

\- Prioritizes important notifications (Placement > Result > Event)

\- Keeps recent + high priority data

