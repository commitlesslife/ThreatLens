import { Router, Request, Response } from "express";

export function createFixturePagesRouter(): Router {
  const router = Router();

  // 1. Scholarship Phish
  router.get("/scholarship", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>State University - Scholarship Disbursement Verification</title>
  <style>
    body { font-family: sans-serif; background: #f4f6f8; margin: 40px; }
    .card { background: white; padding: 24px; border-radius: 8px; max-width: 480px; margin: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1e3a8a; font-size: 20px; }
    .field { margin-bottom: 16px; }
    label { display: block; font-weight: bold; margin-bottom: 4px; }
    input[type="text"], input[type="password"] { width: 100%; padding: 8px; box-sizing: border-box; }
    button { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; }
    .synthetic-badge { font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="synthetic-badge">[CONTROLLED FIXTURE]</span>
    <h1>State University Scholarship Portal</h1>
    <p>Please re-authenticate your institutional account to release pending scholarship funds for this semester.</p>
    <form action="/receiver/canary" method="POST">
      <div class="field">
        <label for="student_id">Student ID / Institutional Email</label>
        <input type="text" id="student_id" name="username" required autocomplete="off" />
      </div>
      <div class="field">
        <label for="campus_password">Campus Password</label>
        <input type="password" id="campus_password" name="password" required autocomplete="off" />
      </div>
      <button type="submit" id="submit-btn">Verify Account</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 2. Cloaked Portal (conditional content based on User-Agent)
  router.get("/cloaked", (req: Request, res: Response): void => {
    const userAgent = (req.headers["user-agent"] || "").toLowerCase();
    const isCrawler = /crawl|bot|spider|threatlenscrawler|curl|wget|slurp/i.test(userAgent);
    const isMobile = /mobile|iphone|ipod|android/i.test(userAgent);

    if (isCrawler) {
      res.status(403).setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head><title>Access Denied</title></head>
<body>
  <h1>403 Forbidden</h1>
  <p>Automated scanning and crawler tools are prohibited from accessing this resource.</p>
</body>
</html>`);
      return;
    }

    if (isMobile) {
      res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Urgent Student Alert - Mobile Verification</title>
  <style>
    body { font-family: sans-serif; background: #fff1f2; margin: 20px; }
    .card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #fecdd3; }
    h2 { color: #9f1239; font-size: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Action Required: Verify Student Account</h2>
    <p>Your student profile requires immediate phone and password re-verification.</p>
    <form action="/receiver/canary" method="POST">
      <input type="text" name="student_id" placeholder="Student ID" /><br/><br/>
      <input type="password" name="password" placeholder="Password" /><br/><br/>
      <input type="text" name="otp" placeholder="6-digit OTP" /><br/><br/>
      <button type="submit">Submit Verification</button>
    </form>
  </div>
</body>
</html>`);
      return;
    }

    // Default desktop response (benign maintenance notice)
    res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>System Maintenance - Student Portal</title>
</head>
<body>
  <div style="max-width: 600px; margin: 40px auto; font-family: sans-serif;">
    <h1>Portal Under Maintenance</h1>
    <p>The student portal is currently undergoing regular scheduled maintenance. Please check back later.</p>
  </div>
</body>
</html>`);
  });

  // 3. Benign Portal (clean university portal)
  router.get("/benign-portal", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official University Student Portal</title>
</head>
<body style="font-family: sans-serif; margin: 40px;">
  <h1>Welcome to Official University Services</h1>
  <p>Campus announcements, library hours, and academic calendars are updated weekly.</p>
  <ul>
    <li>Campus Directory</li>
    <li>Library Catalog</li>
    <li>Academic Calendar</li>
  </ul>
</body>
</html>`);
  });

  // 4. Brand Clone (visual similarity)
  router.get("/brand-clone", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>State Federal Bank - Secure Login</title>
</head>
<body style="font-family: sans-serif; background: #002d62; color: white; padding: 40px;">
  <div style="background: white; color: #333; max-width: 400px; padding: 20px; border-radius: 4px; margin: auto;">
    <h2>State Federal Bank Online Access</h2>
    <p>Sign in to your online banking profile.</p>
    <form action="/receiver/canary" method="POST">
      <input type="text" name="account_number" placeholder="User ID / Account" /><br/><br/>
      <input type="password" name="password" placeholder="Passcode" /><br/><br/>
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 5. Synthetic Inbox (Simulated Webmail / Gmail-like Fixture)
  router.get("/synthetic-inbox", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Campus Webmail (Simulated Team Fixture)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f1f3f4; margin: 0; padding: 20px; }
    .inbox-container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); overflow: hidden; }
    .inbox-header { background: #1a73e8; color: white; padding: 14px 20px; font-size: 18px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
    .fixture-badge { background: #fef08a; color: #854d0e; font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .messages-list { padding: 16px; }
    .message-item { border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin-bottom: 12px; transition: border-color 0.2s; }
    .message-item.threatlens-highlight { border: 2px solid #ef4444; background: #fef2f2; }
    .message-meta { font-size: 13px; color: #5f6368; margin-bottom: 6px; }
    .message-subject { font-size: 16px; font-weight: 600; color: #202124; margin-bottom: 8px; }
    .message-body { font-size: 14px; color: #3c4043; line-height: 1.5; }
    .message-body a { color: #1a73e8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="inbox-container" data-threatlens-container="inbox">
    <div class="inbox-header">
      <span>University Webmail — Active Messages</span>
      <span class="fixture-badge">[TEAM-OWNED SYNTHETIC FIXTURE]</span>
    </div>
    <div class="messages-list">
      <!-- Benign Message 1 -->
      <div class="message-item" id="msg-inbox-1" data-message-id="msg-inbox-1" data-sender="library-notices@university.test">
        <div class="message-meta">From: <strong>Library Circulation</strong> &lt;library-notices@university.test&gt; • Today, 10:15 AM</div>
        <div class="message-subject">Library Hold Notice: Computer Networks (4th Ed.)</div>
        <div class="message-body">
          Your reserved textbook 'Computer Networks' is ready for pickup at the Main Campus Library circulation desk. Holds expire in 5 business days. No login or confirmation is required.
        </div>
      </div>

      <!-- Suspicious Message 2 -->
      <div class="message-item" id="msg-inbox-2" data-message-id="msg-inbox-2" data-sender="disbursement-urgent@scholarship-alert.test">
        <div class="message-meta">From: <strong>Urgent Scholarship Processing</strong> &lt;disbursement-urgent@scholarship-alert.test&gt; • Today, 11:42 AM</div>
        <div class="message-subject">URGENT: Re-verify campus credentials to release pending scholarship funds</div>
        <div class="message-body">
          Action Required: Your student scholarship disbursement of $2,500 is pending. You must verify your institutional password and account details immediately to prevent cancellation. Click here to confirm your credentials:
          <a href="http://localhost:4001/fixtures/scholarship" class="threatlens-target-link">http://localhost:4001/fixtures/scholarship</a>
        </div>
      </div>

      <!-- Benign Message 3 -->
      <div class="message-item" id="msg-inbox-3" data-message-id="msg-inbox-3" data-sender="student-events@university.test">
        <div class="message-meta">From: <strong>Student Activities Board</strong> &lt;student-events@university.test&gt; • Yesterday, 4:00 PM</div>
        <div class="message-subject">Campus Spring Fest: Schedule and Map</div>
        <div class="message-body">
          Join us this Friday for the annual Campus Spring Fest. View event schedules and dining menus at our official portal:
          <a href="http://localhost:4001/fixtures/benign-portal">http://localhost:4001/fixtures/benign-portal</a>.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  // 6. Synthetic Chat (Simulated WhatsApp/Slack-like Chat Thread)
  router.get("/synthetic-chat", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Campus Connect Chat (Simulated Team Fixture)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #e5ddd5; margin: 0; padding: 20px; }
    .chat-container { max-width: 600px; margin: 0 auto; background: #efeae2; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column; height: 600px; }
    .chat-header { background: #075e54; color: white; padding: 14px 20px; font-size: 16px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
    .fixture-badge { background: #fef08a; color: #854d0e; font-size: 11px; padding: 3px 6px; border-radius: 4px; font-weight: bold; }
    .chat-stream { padding: 16px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .chat-bubble { max-width: 80%; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.4; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); position: relative; }
    .chat-bubble.threatlens-highlight { outline: 2px solid #ef4444; background: #fee2e2 !important; }
    .bubble-incoming { background: white; align-self: flex-start; }
    .bubble-outgoing { background: #dcf8c6; align-self: flex-end; }
    .bubble-sender { font-size: 12px; font-weight: bold; color: #128c7e; margin-bottom: 4px; }
    .bubble-time { font-size: 11px; color: #8696a0; text-align: right; margin-top: 4px; }
    .chat-bubble a { color: #027eb5; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="chat-container" data-threatlens-container="chat">
    <div class="chat-header">
      <span>Campus Engineering Group Chat</span>
      <span class="fixture-badge">[SYNTHETIC CHAT FIXTURE]</span>
    </div>
    <div class="chat-stream">
      <!-- Benign Message 1 -->
      <div class="chat-bubble bubble-incoming" id="msg-chat-1" data-message-id="msg-chat-1" data-sender="Alex Rivera">
        <div class="bubble-sender">Alex Rivera</div>
        <div class="bubble-text">Hey team, are we still meeting in lab 402 this afternoon to run the benchmarks?</div>
        <div class="bubble-time">14:05</div>
      </div>

      <!-- Suspicious Message 2 -->
      <div class="chat-bubble bubble-incoming" id="msg-chat-2" data-message-id="msg-chat-2" data-sender="IT Security Support">
        <div class="bubble-sender">IT Security Support</div>
        <div class="bubble-text">
          URGENT: Suspicious activity detected on your campus network ID. Re-verify your account credentials immediately or your account will be suspended within 2 hours:
          <a href="http://localhost:4001/fixtures/scholarship" class="threatlens-target-link">http://localhost:4001/fixtures/scholarship</a>
        </div>
        <div class="bubble-time">14:12</div>
      </div>

      <!-- Benign Message 3 -->
      <div class="chat-bubble bubble-outgoing" id="msg-chat-3" data-message-id="msg-chat-3" data-sender="You">
        <div class="bubble-sender">You</div>
        <div class="bubble-text">Thanks Alex, yes! Bringing my laptop now.</div>
        <div class="bubble-time">14:15</div>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  return router;
}
