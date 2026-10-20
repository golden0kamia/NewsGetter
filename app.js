const NEWS_URL = 'https://n8n.piguetb.ch/webhook/c3fa1032-2e42-4421-ba4b-6a629488d90d';
const INTERACTION_URL = 'https://n8n.piguetb.ch/webhook/469014f7-94bc-4416-9fa7-f4e33823eacd';
const REFRESH_INTERVAL = 5 * 60 * 1000;

// Escape text before inserting it into HTML to avoid markup injection from the feed
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

// Only allow http(s) URLs for links and images
function safeURL(value) {
    try {
        const url = new URL(value, window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

// Function to update the header console status
function setStatus(text, state) {
    document.getElementById('feedStatus').textContent = `> ${text}`;
    document.getElementById('statusLed').className = `led ${state}`;
}

// Function to fetch news data from the API
async function fetchNewsData() {
    const response = await fetch(NEWS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch news (HTTP ${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

// Function to handle like/dislike actions
async function handleInteraction(categories, action) {
    try {
        const response = await fetch(INTERACTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: action === 'like' ? 'up' : 'down',
                categorie: categories
            })
        });

        if (!response.ok) {
            throw new Error('Failed to register interaction');
        }

        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// Function to create a news card
function createNewsCard(news) {
    const card = document.createElement('article');
    card.className = 'news-card';

    const link = safeURL(news.link);
    const image = safeURL(news.image);
    const date = news.date ? new Date(news.date) : null;

    if (link) {
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', news.title ?? 'News article');
    }

    card.innerHTML = `
        ${image ? `
        <div class="card-image">
            <img src="${escapeHTML(image)}" alt="" loading="lazy">
        </div>
        ` : ''}
        <div class="card-content">
            <h2 class="card-title">${escapeHTML(news.title)}</h2>
            ${news.resume ? `<p class="card-resume">${escapeHTML(news.resume)}</p>` : ''}
            <div class="card-info">
                ${news.source ? `
                <div class="card-source">
                    <i class="fas fa-newspaper" aria-hidden="true"></i> ${escapeHTML(news.source)}
                </div>
                ` : ''}
                ${news.author ? `
                <div class="card-author">
                    <i class="fas fa-user" aria-hidden="true"></i> ${escapeHTML(news.author)}
                </div>
                ` : ''}
                ${news.categories ? `
                <div class="card-category">
                    <i class="fas fa-folder" aria-hidden="true"></i> ${escapeHTML(news.categories)}
                </div>
                ` : ''}
                ${date && !isNaN(date) ? `
                <div class="card-date">
                    <i class="fas fa-calendar" aria-hidden="true"></i> ${date.toLocaleDateString()}
                </div>
                ` : ''}
            </div>
            <div class="card-actions">
                <button class="action-button like" data-action="like" aria-label="Like" aria-pressed="false">
                    <i class="fas fa-thumbs-up" aria-hidden="true"></i>
                </button>
                <button class="action-button dislike" data-action="dislike" aria-label="Dislike" aria-pressed="false">
                    <i class="fas fa-thumbs-down" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    `;

    // Open the news link on click or Enter, but not when using the action buttons
    const openLink = () => {
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.action-button')) {
            openLink();
        }
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target === card) {
            openLink();
        }
    });

    // Add click events for like/dislike buttons
    const actionButtons = card.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click event
            const action = button.dataset.action;

            // Remove active state from both buttons
            actionButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });

            const success = await handleInteraction(news.categories, action);
            if (success) {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            }
        });
    });

    return card;
}

// Function to initialize the news feed
async function initNewsFeed() {
    const newsGrid = document.getElementById('newsGrid');

    // Only show the loading placeholder on first load to avoid flicker on refresh
    if (!newsGrid.querySelector('.news-card')) {
        newsGrid.innerHTML = '<div class="loading">LOADING NEWS...</div>';
    }
    setStatus('RECEIVING TRANSMISSION...', 'busy');

    try {
        const newsData = await fetchNewsData();

        if (newsData.length === 0) {
            newsGrid.innerHTML = '<div class="error">NO NEWS AVAILABLE</div>';
            setStatus('NO SIGNAL', 'error');
            return;
        }

        newsGrid.replaceChildren(...newsData.map(createNewsCard));

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setStatus(`${newsData.length} ARTICLES // SYNC ${time}`, 'on');
    } catch (error) {
        console.error('Error initializing news feed:', error);
        if (!newsGrid.querySelector('.news-card')) {
            newsGrid.innerHTML = '<div class="error">FAILED TO LOAD NEWS</div>';
        }
        setStatus('TRANSMISSION ERROR', 'error');
    }
}

// Initialize the news feed when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initNewsFeed();

    // Refresh news periodically
    setInterval(initNewsFeed, REFRESH_INTERVAL);
});
