/* =====================================================
   Lost Buddy.in — Auth (Pure Frontend, localStorage)
   - Signup: save account (name, mobile, email, city, passHash)
   - Login: via email OR 10-digit mobile + password
   - NOTE: For learning/demo only (no backend)
   ===================================================== */

// Simple email regex for basic format checking
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash password using SHA-256 (keeps plain text out of storage)
async function sha256hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Read all accounts (object) from localStorage
function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem("lb_accounts") || "{}");
  } catch {
    return {};
  }
}

// Save all accounts (object) to localStorage
function saveAccounts(map) {
  localStorage.setItem("lb_accounts", JSON.stringify(map));
}

// Convenience: show message in an element
function showMsg(el, text, type = "") {
  el.className = "form-msg" + (type ? ` ${type}` : "");
  el.innerHTML = text;
}

/* =======================
   SIGNUP FLOW (signup.html)
   ======================= */
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("signupMsg");

    // Collect values
    const name = signupForm.name.value.trim();
    const mobile = signupForm.mobile.value.trim();
    const email  = signupForm.email.value.trim().toLowerCase();
    const city   = signupForm.city.value.trim();
    const pass   = signupForm.password.value;
    const confirm= signupForm.confirm.value;

    // Validate basics
    if (!name) return showMsg(msg, "Please enter your name.", "error");
    if (!/^\d{10}$/.test(mobile)) return showMsg(msg, "Enter a valid 10-digit mobile number.", "error");
    if (!emailRx.test(email)) return showMsg(msg, "Enter a valid email address.", "error");
    if (pass.length < 6) return showMsg(msg, "Password must be at least 6 characters.", "error");
    if (pass !== confirm) return showMsg(msg, "Passwords do not match.", "error");

    const accounts = loadAccounts();

    // Avoid duplicates (by email or mobile)
    if (accounts[email]) {
      return showMsg(msg, 'This email is already registered. <a href="login.html">Login</a>', "error");
    }
    const mobileTaken = Object.values(accounts).some(a => a.mobile === mobile);
    if (mobileTaken) {
      return showMsg(msg, 'This mobile is already registered. <a href="login.html">Login</a>', "error");
    }

    // Hash and store
    const passHash = await sha256hex(pass);
    accounts[email] = { name, mobile, email, city, passHash, createdAt: Date.now() };
    saveAccounts(accounts);

    showMsg(msg, "Account created successfully! Redirecting to login…", "success");
    setTimeout(() => (window.location.href = "login.html"), 1200);
  });
}

/* ======================
   LOGIN FLOW (login.html)
   ====================== */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("loginMsg");

    const userInput = loginForm.user.value.trim().toLowerCase();
    const pass = loginForm.password.value;

    if (!userInput || !pass) return showMsg(msg, "Enter your credentials.", "error");

    const accounts = loadAccounts();

    // Try by email first
    let account = accounts[userInput] || null;

    // If not found, try by mobile
    if (!account) {
      account = Object.values(accounts).find(a => a.mobile === userInput) || null;
    }
    if (!account) return showMsg(msg, 'No account found. <a href="signup.html">Create one</a>', "error");

    // Check password
    const hash = await sha256hex(pass);
    if (hash !== account.passHash) return showMsg(msg, "Incorrect password.", "error");

    // Success: keep a simple "session" (current user without password)
    const current = { name: account.name, email: account.email, mobile: account.mobile, city: account.city };
    localStorage.setItem("lb_current", JSON.stringify(current));

    // Replace form with welcome message
    const area = document.getElementById("authArea");
    area.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 6px;">Welcome, ${current.name}</h3>
        <p style="margin:0 0 10px; color: var(--muted);">${current.email || current.mobile} ${current.city ? "• " + current.city : ""}</p>
        <div class="actions">
          <a class="btn btn-primary" href="index.html"><i class="fa-solid fa-house"></i> Go Home</a>
          <button class="btn btn-ghost" id="logoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>
      </div>
    `;

    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("lb_current");
      window.location.reload();
    });
  });
}
