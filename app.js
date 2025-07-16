// Function to fetch news data from the API
async function fetchNewsData() {
    try {
        const response = await fetch('https://n8n.piguetb.ch/webhook/c3fa1032-2e42-4421-ba4b-6a629488d90d');
        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

// Function to handle like/dislike actions
async function handleInteraction(categories, action) {
    try {
        const response = await fetch('https://n8n.piguetb.ch/webhook/469014f7-94bc-4416-9fa7-f4e33823eacd', {
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
    const card = document.createElement('div');
    card.className = 'news-card';
    
    card.innerHTML = `
        ${news.image ? `
        <div class="card-image">
            <img src="${news.image}" alt="${news.title}">
        </div>
        ` : ''}
        <div class="card-content">
            <h2 class="card-title">${news.title}</h2>
            ${news.resume ? `<p class="card-resume">${news.resume}</p>` : ''}
            <div class="card-info">
                ${news.source ? `
                <div class="card-source">
                    <i class="fas fa-newspaper"></i> ${news.source}
                </div>
                ` : ''}
                ${news.author ? `
                <div class="card-author">
                    <i class="fas fa-user"></i> ${news.author}
                </div>
                ` : ''}
                ${news.categories ? `
                <div class="card-category">
                    <i class="fas fa-folder"></i> ${news.categories}
                </div>
                ` : ''}
                ${news.date ? `
                <div class="card-date">
                    <i class="fas fa-calendar"></i> ${new Date(news.date).toLocaleDateString()}
                </div>
                ` : ''}
            </div>
            <div class="card-actions">
                <button class="action-button like" data-action="like">
                    <i class="fas fa-thumbs-up"></i>
                </button>
                <button class="action-button dislike" data-action="dislike">
                    <i class="fas fa-thumbs-down"></i>
                </button>
            </div>
        </div>
    `;

    // Add click event to open the news link
    card.addEventListener('click', (e) => {
        // Don't open the link if clicking on action buttons
        if (!e.target.closest('.action-button')) {
            window.open(news.link, '_blank');
        }
    });

    // Add click events for like/dislike buttons
    const actionButtons = card.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click event
            const action = button.dataset.action;
            const categories = news.categories;

            // Remove active class from both buttons
            button.parentElement.querySelectorAll('.action-button').forEach(btn => {
                btn.classList.remove('active');
            });

            const success = await handleInteraction(categories, action);
            if (success) {
                button.classList.add('active');
            }
        });
    });

    return card;
}

// Function to initialize the news feed
async function initNewsFeed() {
    const newsGrid = document.getElementById('newsGrid');
    
    // Show loading state
    newsGrid.innerHTML = '<div class="loading">Loading news...</div>';
    
    try {
        const newsData = await fetchNewsData();
        
        // Clear loading state
        newsGrid.innerHTML = '';
        
        if (newsData.length === 0) {
            newsGrid.innerHTML = '<div class="error">No news available</div>';
            return;
        }

        newsData.forEach(news => {
            const card = createNewsCard(news);
            newsGrid.appendChild(card);
        });
    } catch (error) {
        newsGrid.innerHTML = '<div class="error">Failed to load news</div>';
        console.error('Error initializing news feed:', error);
    }
}

// Initialize the news feed when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initNewsFeed();
    
    // Refresh news every 5 minutes
    setInterval(initNewsFeed, 5 * 60 * 1000);
});
