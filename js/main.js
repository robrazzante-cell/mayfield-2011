// Theme toggle
function initTheme() {
    const saved = localStorage.getItem('mayfieldTheme') || 'current';
    document.documentElement.setAttribute('data-theme', saved === 'throwback' ? 'throwback' : '');
    updateThemeBtn(saved);
}

function toggleTheme() {
    const isThrowback = document.documentElement.getAttribute('data-theme') === 'throwback';
    const next = isThrowback ? '' : 'throwback';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mayfieldTheme', next === 'throwback' ? 'throwback' : 'current');
    updateThemeBtn(next === 'throwback' ? 'throwback' : 'current');
}

function updateThemeBtn(theme) {
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        if (theme === 'throwback') {
            btn.innerHTML = '<i class="fas fa-bolt"></i> Now';
            btn.title = 'Switch to current Mayfield branding';
        } else {
            btn.innerHTML = '<i class="fas fa-history"></i> \'11';
            btn.title = 'Switch to Class of 2011 throwback';
        }
    });
}
window.toggleTheme = toggleTheme;
initTheme();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) navMenu.classList.remove('open');
    });
}

// Auth state handling
function handleAuth() {
    const user = auth.currentUser;
    if (user) {
        if (confirm('Sign out?')) auth.signOut();
    } else {
        auth.signInWithPopup(googleProvider).catch(err => {
            console.error('Sign-in error:', err);
        });
    }
}

auth.onAuthStateChanged(user => {
    const authBtn = document.getElementById('authBtn');
    const authBtnText = document.getElementById('authBtnText');
    const userAvatar = document.getElementById('userAvatar');
    const userPhoto = document.getElementById('userPhoto');
    const userNameEl = document.getElementById('userName');
    const signinPrompt = document.getElementById('signinPrompt');

    if (user) {
        if (authBtnText) authBtnText.textContent = 'Sign Out';
        if (authBtn) authBtn.querySelector('i').className = 'fas fa-sign-out-alt';
        if (userAvatar) {
            userAvatar.style.display = 'flex';
            if (userPhoto) userPhoto.src = user.photoURL || '';
            if (userNameEl) userNameEl.textContent = user.displayName ? user.displayName.split(' ')[0] : '';
        }
        if (signinPrompt) signinPrompt.style.display = 'none';
        ensureUserDoc(user);
    } else {
        if (authBtnText) authBtnText.textContent = 'Sign In';
        if (authBtn) authBtn.querySelector('i').className = 'fab fa-google';
        if (userAvatar) userAvatar.style.display = 'none';
        if (signinPrompt) signinPrompt.style.display = '';
    }
});

async function ensureUserDoc(user) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            employer: '',
            linkedin: '',
            website: '',
            city: '',
            state: '',
            lat: null,
            lng: null,
            hasBusiness: false,
            businessName: '',
            businessCategory: '',
            businessDesc: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// Post a comment (shared across pages)
async function postComment(collection, parentId, text, user) {
    if (!text.trim()) return;
    const flagged = containsProfanity(text);
    const doc = await db.collection(collection).add({
        parentId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL || '',
        text: text.trim(),
        flagged,
        flagCount: 0,
        flaggedBy: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (flagged) notifyFlag({ id: doc.id, text, userName: user.displayName, collection });
    return doc.id;
}

// Flag a comment
async function flagComment(collection, commentId, userId) {
    const ref = db.collection(collection).doc(commentId);
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = snap.data();
    if (data.flaggedBy && data.flaggedBy.includes(userId)) return; // already flagged by this user
    await ref.update({
        flagCount: firebase.firestore.FieldValue.increment(1),
        flaggedBy: firebase.firestore.FieldValue.arrayUnion(userId),
        flagged: true
    });
    notifyFlag({ id: commentId, text: data.text, userName: data.userName, collection });
}

async function notifyFlag(info) {
    try {
        await fetch('/api/flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(info)
        });
    } catch (e) { /* non-blocking */ }
}

// Basic profanity filter (extend as needed)
const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot'];
function containsProfanity(text) {
    const lower = text.toLowerCase();
    return BAD_WORDS.some(w => lower.includes(w));
}

function timeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

// Attach to window for inline handlers
window.handleAuth = handleAuth;
window.flagComment = flagComment;
window.postComment = postComment;
window.timeAgo = timeAgo;
