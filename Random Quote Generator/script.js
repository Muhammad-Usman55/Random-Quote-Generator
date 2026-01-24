const quoteContainer = document.querySelector('.quote-box');
const quoteText = document.getElementById('quote');
const authorText = document.getElementById('author');
const twitterBtn = document.getElementById('twitter');
const newQuoteBtn = document.getElementById('new-quote');
const loader = document.getElementById('loader');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('i');

// Show Loading
function showLoadingSpinner() {
    loader.style.display = 'block';
    quoteContainer.hidden = true;
}

// Hide Loading
function removeLoadingSpinner() {
    if (!loader.hidden) {
        quoteContainer.hidden = false;
        loader.style.display = 'none';
    }
}

// Get Quote From API
async function getQuote() {
    showLoadingSpinner();
    newQuoteBtn.disabled = true; // Disable button to prevent spamming
    newQuoteBtn.style.opacity = '0.7';
    newQuoteBtn.style.cursor = 'not-allowed';

    // Using dummyjson as a reliable fallback/primary since quotable can be unstable
    const apiUrl = 'https://dummyjson.com/quotes/random';
    try {
        // Enforce a minimum loading time for better UX (prevents flickering)
        const [response] = await Promise.all([
            fetch(apiUrl),
            new Promise(resolve => setTimeout(resolve, 600))
        ]);

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // If Author is blank, add 'Unknown'
        if (!data.author) {
            authorText.innerText = 'Unknown';
        } else {
            authorText.innerText = data.author;
        }

        // Reduce font size for long quotes
        // data.quote is the property for dummyjson
        if (data.quote.length > 120) {
            quoteText.classList.add('long-quote');
        } else {
            quoteText.classList.remove('long-quote');
        }

        quoteText.innerText = data.quote;

        // Update Twitter Button
        twitterBtn.href = `https://twitter.com/intent/tweet?text=${data.quote} - ${data.author}`;

        // Add Animation Class
        quoteText.classList.remove('animate-in');
        void quoteText.offsetWidth; // Trigger reflow
        quoteText.classList.add('animate-in');

        removeLoadingSpinner();
    } catch (error) {
        console.error('Whoops, no quote', error);
        // Fallback or retry logic could go here
        quoteText.innerText = "An error occurred. Please try again.";
        authorText.innerText = "";
        removeLoadingSpinner();
    } finally {
        newQuoteBtn.disabled = false;
        newQuoteBtn.style.opacity = '1';
        newQuoteBtn.style.cursor = 'pointer';
    }
}

// Theme Handling
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

const updateThemeIcon = (theme) => {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// Check Local Storage for Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Event Listeners
newQuoteBtn.addEventListener('click', getQuote);
themeToggleBtn.addEventListener('click', toggleTheme);

// On Load
getQuote();
