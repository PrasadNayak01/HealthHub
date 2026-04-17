// /**
//  * Shared auth utility.
//  * Call initPage(expectedRole) at the top of every protected page's JS.
//  * It returns the user object so the page can use it immediately.
//  *
//  * If not authenticated  → redirect to /login.html
//  * If wrong role         → redirect to /login.html  (server already guards this,
//  *                          but this is a client-side safety net)
//  * Never redirects to another dashboard — that prevents the ping-pong loop.
//  */
// async function initPage(expectedRole) {
//   try {
//     const res  = await fetch("http://localhost:5001/api/current-user", { credentials: "include" });
//     if (!res.ok) { window.location.replace("/login.html"); return null; }

//     const data = await res.json();
//     if (!data.success || !data.user) { window.location.replace("/login.html"); return null; }

//     if (data.user.role !== expectedRole) {
//       // Wrong role — send to login, NOT to the other dashboard
//       window.location.replace("/login.html");
//       return null;
//     }

//     return data.user;
//   } catch {
//     window.location.replace("/login.html");
//     return null;
//   }
// }

// async function sharedLogout() {
//   try {
//     const res  = await fetch("http://localhost:5001/logout", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       credentials: "include",
//     });
//     const data = await res.json();
//     if (data.success) {
//       window.location.replace("/login.html");
//     }
//   } catch {
//     window.location.replace("/login.html");
//   }
// }