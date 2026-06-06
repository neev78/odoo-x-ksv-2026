/* VENDOR BRIDGE - authentication page logic (login / signup / forgot / reset) */

function togglePw(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  if (btn) btn.innerHTML = el.type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
}

function setLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${label || 'Please wait...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.label || label;
  }
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------- LOGIN ----------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    const btn = document.getElementById('loginBtn');

    if (!emailRe.test(email)) return VB.toast('Please enter a valid email address.', 'error');
    if (!password) return VB.toast('Please enter your password.', 'error');

    setLoading(btn, true, 'Signing in...');
    try {
      const res = await VB.post('/auth/login', { email, password });
      VB.setAuth(res.token, res.user, remember);
      VB.toast(`Welcome back, ${res.user.name}!`);
      setTimeout(() => (location.href = 'dashboard.html'), 500);
    } catch (err) {
      VB.toast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}

// ---------------- SIGNUP ----------------
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;
    const btn = document.getElementById('signupBtn');

    if (!name) return VB.toast('Please enter your full name.', 'error');
    if (!emailRe.test(email)) return VB.toast('Please enter a valid email address.', 'error');
    if (password.length < 6) return VB.toast('Password must be at least 6 characters.', 'error');
    if (password !== confirmPassword) return VB.toast('Passwords do not match.', 'error');

    setLoading(btn, true, 'Creating account...');
    try {
      const res = await VB.post('/auth/register', { name, email, password, confirmPassword, role });
      VB.setAuth(res.token, res.user, true);
      VB.toast('Account created successfully!');
      setTimeout(() => (location.href = 'dashboard.html'), 600);
    } catch (err) {
      VB.toast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}

// ---------------- FORGOT PASSWORD ----------------
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('forgotBtn');
    const hint = document.getElementById('resetHint');
    if (!emailRe.test(email)) return VB.toast('Please enter a valid email address.', 'error');

    setLoading(btn, true, 'Sending...');
    try {
      const res = await VB.post('/auth/forgot-password', { email });
      VB.toast(res.message || 'Reset link sent.');
      // Demo convenience: when SMTP isn't configured the API returns a token
      if (res.devResetToken && hint) {
        hint.classList.remove('d-none');
        hint.innerHTML = `<b>Demo mode:</b> SMTP not configured, so here is your reset link directly:<br/>
          <a href="reset-password.html?token=${res.devResetToken}" class="link-primary">Reset your password →</a>`;
      }
      setLoading(btn, false);
    } catch (err) {
      VB.toast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}

// ---------------- RESET PASSWORD ----------------
const resetForm = document.getElementById('resetForm');
if (resetForm) {
  const token = new URLSearchParams(location.search).get('token');
  if (!token) VB.toast('Missing reset token. Please use the link from your email.', 'error');

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('resetBtn');
    if (password.length < 6) return VB.toast('Password must be at least 6 characters.', 'error');
    if (password !== confirmPassword) return VB.toast('Passwords do not match.', 'error');

    setLoading(btn, true, 'Updating...');
    try {
      await VB.post(`/auth/reset-password/${token}`, { password, confirmPassword });
      VB.toast('Password updated! Redirecting to login...');
      setTimeout(() => (location.href = 'index.html'), 1200);
    } catch (err) {
      VB.toast(err.message, 'error');
      setLoading(btn, false);
    }
  });
}
