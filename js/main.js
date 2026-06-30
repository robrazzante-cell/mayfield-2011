const ADMIN_EMAIL = 'rob.razzante@gmail.com';

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) navMenu.classList.remove('open');
    });
}

auth.getRedirectResult().then(result => {
    if (result && result.user) console.log('Signed in via redirect:', result.user.email);
}).catch(err => console.error('Redirect sign-in error:', err));

function handleAuth() {
    const user = auth.currentUser;
    if (user) {
        if (confirm('Sign out?')) auth.signOut();
        return;
    }
    auth.signInWithRedirect(googleProvider);
}

auth.onAuthStateChanged(async user => {
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

        const status = await ensureUserDoc(user);
        applyAccessControl(user, status);

        if (status === 'approved' && !localStorage.getItem('welcomed_' + user.uid)) {
            localStorage.setItem('welcomed_' + user.uid, '1');
            setTimeout(() => showWelcomeTour(user), 600);
        }
    } else {
        if (authBtnText) authBtnText.textContent = 'Sign In';
        if (authBtn) authBtn.querySelector('i').className = 'fab fa-google';
        if (userAvatar) userAvatar.style.display = 'none';
        if (signinPrompt) signinPrompt.style.display = '';

        // Redirect off protected pages
        const page = window.location.pathname.split('/').pop() || 'index.html';
        const exempt = ['index.html', '', 'teacher.html', 'privacy.html'];
        if (!exempt.includes(page)) {
            window.location.replace('index.html');
            return;
        }
        // Lock down home page the same as a pending user
        document.querySelectorAll('.nav-menu > li:not(:first-child)').forEach(li => li.style.display = 'none');
        document.querySelectorAll('.gated-section').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.footer-nav-gated').forEach(el => el.style.display = 'none');
    }
});

async function ensureUserDoc(user) {
    const isAdmin = user.email === ADMIN_EMAIL;
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
        const status = isAdmin ? 'approved' : 'pending';
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
            status,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (!isAdmin) {
            try {
                const idToken = await user.getIdToken();
                fetch('/api/classmate-joined', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({ name: user.displayName || 'Unknown', email: user.email || '' })
                }).catch(() => {});
            } catch (e) { /* non-blocking */ }
        }
        return status;
    }

    const data = snap.data();
    // Grandfather existing users without a status field as approved
    if (!data.status) {
        await ref.update({ status: 'approved' });
        return 'approved';
    }
    return data.status;
}

function applyAccessControl(user, status) {
    const isAdmin = user.email === ADMIN_EMAIL;

    if (isAdmin) {
        injectAdminLink();
        return;
    }

    if (status === 'approved') return;

    // Pending or rejected — only allow home, admin, and teacher pages
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const exempt = ['index.html', '', 'admin.html', 'teacher.html'];
    if (!exempt.includes(page)) {
        window.location.replace('index.html');
        return;
    }

    // Lock nav to Home only
    document.querySelectorAll('.nav-menu > li:not(:first-child)').forEach(li => li.style.display = 'none');

    // Show pending banner and hide gated sections on home page
    showPendingBanner(status);
    document.querySelectorAll('.gated-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.footer-nav-gated').forEach(el => el.style.display = 'none');
    const connectedBox = document.getElementById('connectedStatBox');
    if (connectedBox) connectedBox.style.display = 'none';
}

function injectAdminLink() {
    const dropdown = document.querySelector('.dropdown-menu');
    if (!dropdown || dropdown.querySelector('[href="admin.html"]')) return;
    const li = document.createElement('li');
    li.innerHTML = '<a href="admin.html"><i class="fas fa-shield-alt"></i> Admin</a>';
    dropdown.appendChild(li);
}

function showPendingBanner(status) {
    const banner = document.getElementById('pendingBanner');
    if (!banner) return;
    if (status === 'rejected') {
        banner.innerHTML = `
            <div style="background:#fff3f3;border:1px solid #f5c6cb;border-radius:var(--radius-lg);padding:1.5rem;text-align:center;">
                <i class="fas fa-lock" style="color:#dc3545;font-size:1.5rem;margin-bottom:0.5rem;display:block;"></i>
                <strong>Access Not Granted</strong>
                <p style="color:var(--text-muted);font-size:0.875rem;margin-top:0.5rem;">Your request was not approved. <a href="mailto:rob.razzante@gmail.com" style="color:var(--green);">Contact Rob</a> if you believe this is an error.</p>
            </div>`;
    } else {
        banner.innerHTML = `
            <div style="background:var(--green-light);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;text-align:center;">
                <i class="fas fa-clock" style="color:var(--green);font-size:1.5rem;margin-bottom:0.5rem;display:block;"></i>
                <strong>Access Pending Approval</strong>
                <p style="color:var(--text-muted);font-size:0.875rem;margin-top:0.5rem;">Welcome! Rob Razzante has been notified and will verify your access shortly. Refresh this page once approved to explore the full site.</p>
            </div>`;
    }
    banner.style.display = 'block';
}

// Post a comment (shared across pages)
async function postComment(collection, parentId, text, user) {
    if (!text.trim()) return;

    // Rate-limit memory wall posts: one per 5 minutes per user
    if (collection === 'memories') {
        const key = `lastMemoryPost_${user.uid}`;
        const last = parseInt(localStorage.getItem(key) || '0');
        const wait = 5 * 60 * 1000 - (Date.now() - last);
        if (wait > 0) {
            alert(`Please wait ${Math.ceil(wait / 60000)} minute(s) before sharing another memory.`);
            return null;
        }
        localStorage.setItem(key, Date.now().toString());
    }

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
    if (data.flaggedBy && data.flaggedBy.includes(userId)) return;
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

function showWelcomeTour(user) {
    const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Wildcat';
    const features = [
        ['fa-map-marked-alt', 'Classmate Map', 'Pin your city and see where the Class of 2011 spread after graduation.'],
        ['fa-briefcase', 'Business Network', 'List your business or find a classmate to hire.'],
        ['fa-football-ball', 'Events', 'Homecoming tailgate Sep 18 · Mayfield vs Barberton. School tour &amp; lunch Sep 19. RSVP now.'],
        ['fa-trophy', 'Class Pride', 'Class superlatives, song, colors, and memories from our time at Mayfield.'],
        ['fa-heart', 'In Memoriam', 'A space to honor and remember the classmates we\'ve lost.'],
        ['fa-id-card', 'Alumni Association', 'Download the membership form and join 2,500+ Mayfield alums.'],
    ];
    const overlay = document.createElement('div');
    overlay.id = 'welcomeModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:16px;max-width:500px;width:100%;padding:2rem;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="width:54px;height:54px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 0.85rem;">
                    <i class="fas fa-paw" style="color:#fff;font-size:1.3rem;"></i>
                </div>
                <h2 style="font-size:1.35rem;font-weight:800;margin-bottom:0.3rem;">Welcome, ${firstName}!</h2>
                <p style="color:var(--text-muted);font-size:0.85rem;">Here's what the Class of 2011 hub has to offer:</p>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.8rem;margin-bottom:1.75rem;">
                ${features.map(([icon, title, desc]) => `
                    <div style="display:flex;align-items:flex-start;gap:0.85rem;">
                        <div style="width:36px;height:36px;background:var(--green-light);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border);">
                            <i class="fas ${icon}" style="color:var(--green);font-size:0.875rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:0.875rem;margin-bottom:0.1rem;">${title}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.5;">${desc}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
                <a href="profile.html" onclick="document.getElementById('welcomeModal').remove()" style="flex:1;min-width:140px;background:var(--green);color:#fff;padding:0.7rem 1rem;border-radius:8px;font-weight:700;font-size:0.85rem;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;">
                    <i class="fas fa-user-edit"></i> Complete My Profile
                </a>
                <button onclick="document.getElementById('welcomeModal').remove()" style="flex:1;min-width:140px;background:#fff;color:var(--text);border:1px solid var(--border);padding:0.7rem 1rem;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;">
                    Explore the Site
                </button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

window.handleAuth = handleAuth;
window.flagComment = flagComment;
window.postComment = postComment;
window.timeAgo = timeAgo;
