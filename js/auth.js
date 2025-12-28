// Authentication System with Firebase

// Promise that resolves when auth is ready
let authReadyPromise = null;
let authReadyResolve = null;

// Initialize auth ready promise
authReadyPromise = new Promise((resolve) => {
    authReadyResolve = resolve;
});

// Listen for auth state changes once
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
        if (authReadyResolve) {
            authReadyResolve(user);
            authReadyResolve = null; // Only resolve once
        }
    });
}

// Wait for auth to be ready
async function waitForAuth() {
    return authReadyPromise;
}

// Check if user is logged in (synchronous - use after auth is ready)
function isLoggedIn() {
    return auth.currentUser !== null;
}

// Check if user is logged in (async - waits for auth to be ready)
async function isLoggedInAsync() {
    await waitForAuth();
    return auth.currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Login user with Firebase
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create/update session in Firestore
        await db.collection('sessions').doc(user.uid).set({
            userId: user.uid,
            email: user.email,
            loginDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user document
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            name: user.displayName || email.split('@')[0],
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        return user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Register new user
async function register(email, password, name) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({ displayName: name });
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            name: name,
            role: 'client',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create session
        await db.collection('sessions').doc(user.uid).set({
            userId: user.uid,
            email: user.email,
            loginDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return user;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// Logout user
async function logout() {
    try {
        const user = auth.currentUser;
        if (user) {
            // Remove session from Firestore
            await db.collection('sessions').doc(user.uid).delete();
        }
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Redirect to login if not authenticated (async version - waits for auth)
async function requireAuth(redirectUrl = null) {
    await waitForAuth();
    
    if (!isLoggedIn()) {
        const currentPage = redirectUrl || window.location.pathname;
        window.location.href = `/login.html?redirect=${encodeURIComponent(currentPage)}`;
        return false;
    }
    return true;
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connexion...';
        
        await login(email, password);
        
        // Get redirect URL from query params or default to home
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || '/index.html';
        
        // Redirect to intended page
        window.location.href = redirect;
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = 'Email ou mot de passe incorrect';
            errorDiv.style.display = 'block';
        } else {
            alert('Erreur de connexion: ' + error.message);
        }
        
        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Se Connecter';
    }
}

// Update header UI based on auth status
function updateAuthUI() {
    const userLink = document.getElementById('user-icon-link') || document.querySelector('.nav-icon .fa-user')?.closest('a');
    if (!userLink) {
        console.log('User icon link not found');
        return;
    }
    
    const userIcon = userLink.querySelector('i');
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is logged in
            console.log('User logged in:', user.email);
            userLink.href = '#';
            userLink.title = `Connecté: ${user.email}`;
            
            // Change icon to indicate logged in status
            if (userIcon) {
                userIcon.className = 'fa-solid fa-user-circle';
            }
            
            // Remove any existing onclick to prevent duplicates
            userLink.onclick = null;
            
            userLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const userName = user.displayName || user.email.split('@')[0];
                const confirmed = confirm(`Connecté en tant que ${userName}\n(${user.email})\n\nVoulez-vous vous déconnecter ?`);
                
                if (confirmed) {
                    logout().then(() => {
                        alert('Déconnexion réussie !');
                        window.location.href = 'index.html';
                    }).catch((error) => {
                        console.error('Logout error:', error);
                        alert('Erreur lors de la déconnexion');
                    });
                }
            });
        } else {
            // User is not logged in
            console.log('User not logged in');
            userLink.href = 'login.html';
            userLink.title = 'Se connecter';
            if (userIcon) {
                userIcon.className = 'fa-solid fa-user';
            }
            userLink.onclick = null;
        }
    });
}

// Update last activity timestamp
function updateActivity() {
    const user = auth.currentUser;
    if (user) {
        db.collection('sessions').doc(user.uid).update({
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.log('Activity update failed:', err));
    }
}

// Update activity every 2 minutes
if (typeof window !== 'undefined') {
    setInterval(updateActivity, 2 * 60 * 1000);
}

// Initialize auth UI on page load (only if not on login/signup pages)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't run updateAuthUI on login/signup pages to prevent redirects
        const isAuthPage = window.location.pathname.includes('login') || 
                          window.location.pathname.includes('signup') ||
                          window.location.pathname.includes('admin-login');
        
        if (!isAuthPage) {
            updateAuthUI();
        }
    });
}
