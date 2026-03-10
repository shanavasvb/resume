(function () {
    const ALLOWED_DOMAINS = [
        'localhost',
        '127.0.0.1',
    ];

    const API_BASE = 'http://localhost:3000';

    const STORAGE_KEY = 'guestbook_submission';

    function isAllowedDomain() {
        const hostname = window.location.hostname;
        return ALLOWED_DOMAINS.some(domain => {
            return hostname === domain || hostname.endsWith('.' + domain);
        });
    }

    function getSource() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') return 'resume';
        const parts = hostname.split('.');
        if (parts.length > 2) {
            return parts[0];
        }
        return 'resume';
    }

   

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getStoredSubmission() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    function setStoredSubmission(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // localStorage not available
        }
    }

    function clearStoredSubmission() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // localStorage not available
        }
    }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'guestbook-overlay';
        overlay.innerHTML = `
            <div class="guestbook-modal" role="dialog" aria-labelledby="guestbook-title">
                <div class="guestbook-header">
                    <h2 id="guestbook-title">📖 Guestbook</h2>
                    <button class="guestbook-close" aria-label="Close">&times;</button>
                </div>
                <div class="guestbook-form-section">
                    <div id="guestbook-form-container">
                        <h3 id="guestbook-form-title">Leave a Message</h3>
                        <form class="guestbook-form" id="guestbook-form">
                            <div class="form-group">
                                <label for="guestbook-name">Name *</label>
                                <input type="text" id="guestbook-name" name="name" required maxlength="50" placeholder="Your name">
                            </div>
                            <div class="form-group">
                                <label for="guestbook-message">Message *</label>
                                <textarea id="guestbook-message" name="message" required maxlength="500" placeholder="Say hello!"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="guestbook-website">Website (optional)</label>
                                <input type="url" id="guestbook-website" name="website" placeholder="https://example.com">
                            </div>
                            <div class="form-buttons">
                                <button type="submit" class="guestbook-submit">Sign Guestbook</button>
                                <button type="button" class="guestbook-cancel" id="guestbook-cancel" style="display: none;">Cancel</button>
                            </div>
                        </form>
                    </div>
                    <div class="guestbook-user-entry" id="guestbook-user-entry" style="display: none;"></div>
                </div>
                <div class="guestbook-messages-section">
                    <h3>Recent Messages</h3>
                    <div class="guestbook-messages" id="guestbook-messages">
                        <div class="guestbook-loading">Loading messages...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function renderUserEntry(entry, container) {
        const statusIcon = entry.status === 'approved' ? '✓' : '⏳';
        const statusClass = entry.status === 'approved' ? 'approved' : 'pending';
        const statusText = entry.status === 'approved' ? 'Approved' : 'Pending review';

        container.innerHTML = `
            <h4>Your Entry</h4>
            <div class="user-entry-status">
                <span class="${statusClass}">${statusIcon} ${statusText}</span>
            </div>
            <div class="user-entry-message">${escapeHtml(entry.message)}</div>
            <div class="user-entry-actions">
                <button type="button" class="edit-btn">Edit</button>
                <button type="button" class="delete-btn">Delete</button>
            </div>
        `;
        container.style.display = 'block';
    }

    function renderMessages(entries, ownEntryId) {
        const container = document.getElementById('guestbook-messages');
        if (!entries || entries.length === 0) {
            container.innerHTML = '<div class="guestbook-empty">No messages yet. Be the first to sign!</div>';
            return;
        }

        const mainDomain = getMainDomain();
        container.innerHTML = entries.map(entry => {
            const isOwn = entry.id === ownEntryId;
            const nameHtml = entry.website
                ? `<a href="${escapeHtml(entry.website)}" target="_blank" rel="noopener">${escapeHtml(entry.name)}</a>`
                : escapeHtml(entry.name);
            const sourceHtml = entry.source
                ? `<span class="entry-source">via <a href="https://${entry.source}.${mainDomain}" target="_blank" rel="noopener">${entry.source}</a></span>`
                : '';

            return `
                <div class="guestbook-entry${isOwn ? ' own-entry' : ''}">
                    <div class="entry-header">
                        <span class="entry-name">${nameHtml}</span>
                        <span class="entry-meta">
                            ${formatDate(entry.createdAt)}
                            ${sourceHtml}
                        </span>
                    </div>
                    <div class="entry-message">${escapeHtml(entry.message)}</div>
                </div>
            `;
        }).join('');
    }

    async function fetchEntries() {
        try {
            const response = await fetch(`${API_BASE}/api/guestbook`);
            if (!response.ok) throw new Error('Failed to fetch');
            return await response.json();
        } catch (error) {
            console.error('Guestbook fetch error:', error);
            return null;
        }
    }

    async function createEntry(data) {
        const response = await fetch(`${API_BASE}/api/guestbook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create entry');
        }
        return await response.json();
    }

    async function updateEntry(id, data) {
        const response = await fetch(`${API_BASE}/api/guestbook/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to update entry');
        }
        return await response.json();
    }

    async function deleteEntry(id) {
        const response = await fetch(`${API_BASE}/api/guestbook/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to delete entry');
        }
    }

    function init() {
        if (!isAllowedDomain()) {
            const btn = document.getElementById('guestbook-btn');
            if (btn) btn.style.display = 'none';
            return;
        }

        const btn = document.getElementById('guestbook-btn');
        if (!btn) return;

        let overlay = null;
        let isEditing = false;

        btn.addEventListener('click', async () => {
            if (!overlay) {
                overlay = createModal();
                setupModalListeners();
            }
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            await loadGuestbook();
        });

        function setupModalListeners() {
            const closeBtn = overlay.querySelector('.guestbook-close');
            const form = document.getElementById('guestbook-form');
            const userEntryContainer = document.getElementById('guestbook-user-entry');

            closeBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('open')) {
                    closeModal();
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('.guestbook-submit');
                const nameInput = document.getElementById('guestbook-name');
                const messageInput = document.getElementById('guestbook-message');
                const websiteInput = document.getElementById('guestbook-website');

                const stored = getStoredSubmission();

                submitBtn.disabled = true;
                submitBtn.textContent = isEditing ? 'Updating...' : 'Signing...';

                try {
                    const data = {
                        message: messageInput.value.trim(),
                        website: websiteInput.value.trim() || null
                    };

                    let entry;
                    if (isEditing && stored) {
                        entry = await updateEntry(stored.id, data);
                    } else {
                        entry = await createEntry({
                            name: nameInput.value.trim(),
                            ...data,
                            source: getSource()
                        });
                    }

                    setStoredSubmission(entry);
                    await loadGuestbook();
                    
                    if (!isEditing) {
                        form.reset();
                    }
                    isEditing = false;
                } catch (error) {
                    alert(error.message);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign Guestbook';
                }
            });

            document.getElementById('guestbook-cancel').addEventListener('click', () => {
                isEditing = false;
                resetFormState();
                loadGuestbook();
            });

            userEntryContainer.addEventListener('click', async (e) => {
                const stored = getStoredSubmission();
                if (!stored) return;

                if (e.target.classList.contains('edit-btn')) {
                    isEditing = true;
                    const formContainer = document.getElementById('guestbook-form-container');
                    const formTitle = document.getElementById('guestbook-form-title');
                    const nameInput = document.getElementById('guestbook-name');
                    const messageInput = document.getElementById('guestbook-message');
                    const websiteInput = document.getElementById('guestbook-website');
                    const submitBtn = form.querySelector('.guestbook-submit');
                    const cancelBtn = document.getElementById('guestbook-cancel');

                    formContainer.style.display = 'block';
                    userEntryContainer.style.display = 'none';
                    formTitle.textContent = 'Edit Your Message';
                    nameInput.value = stored.name;
                    nameInput.disabled = true;
                    messageInput.value = stored.message;
                    websiteInput.value = stored.website || '';
                    submitBtn.textContent = 'Update Entry';
                    cancelBtn.style.display = 'inline-block';
                    messageInput.focus();
                }

                if (e.target.classList.contains('delete-btn')) {
                    if (!confirm('Are you sure you want to delete your entry?')) return;

                    try {
                        await deleteEntry(stored.id);
                        clearStoredSubmission();
                        isEditing = false;
                        const formContainer = document.getElementById('guestbook-form-container');
                        const nameInput = document.getElementById('guestbook-name');
                        formContainer.style.display = 'block';
                        nameInput.disabled = false;
                        form.reset();
                        form.querySelector('.guestbook-submit').textContent = 'Sign Guestbook';
                        await loadGuestbook();
                    } catch (error) {
                        alert(error.message);
                    }
                }
            });
        }

        function closeModal() {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        function resetFormState() {
            const form = document.getElementById('guestbook-form');
            const formTitle = document.getElementById('guestbook-form-title');
            const nameInput = document.getElementById('guestbook-name');
            const cancelBtn = document.getElementById('guestbook-cancel');
            const submitBtn = form.querySelector('.guestbook-submit');

            formTitle.textContent = 'Leave a Message';
            nameInput.disabled = false;
            cancelBtn.style.display = 'none';
            submitBtn.textContent = 'Sign Guestbook';
            form.reset();
        }

        async function loadGuestbook() {
            const messagesContainer = document.getElementById('guestbook-messages');
            const userEntryContainer = document.getElementById('guestbook-user-entry');
            const form = document.getElementById('guestbook-form');
            const nameInput = document.getElementById('guestbook-name');

            messagesContainer.innerHTML = '<div class="guestbook-loading">Loading messages...</div>';

            const entries = await fetchEntries();
            const stored = getStoredSubmission();

            if (entries === null) {
                messagesContainer.innerHTML = '<div class="guestbook-error">Failed to load messages. Please try again.</div>';
                return;
            }

            renderMessages(entries, stored?.id);

            const formContainer = document.getElementById('guestbook-form-container');

            if (stored) {
                const freshEntry = entries.find(e => e.id === stored.id);
                if (freshEntry) {
                    setStoredSubmission(freshEntry);
                    renderUserEntry(freshEntry, userEntryContainer);
                    formContainer.style.display = 'none';
                    nameInput.disabled = true;
                } else {
                    userEntryContainer.style.display = 'none';
                    formContainer.style.display = 'block';
                    nameInput.disabled = false;
                }
            } else {
                userEntryContainer.style.display = 'none';
                formContainer.style.display = 'block';
                nameInput.disabled = false;
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
