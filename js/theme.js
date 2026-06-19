// js/theme.js

export function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const rootElement = document.documentElement;
  
  // Check for saved user preference, if any, on load
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  if (currentTheme === 'dark') {
    rootElement.setAttribute('data-theme', 'dark');
    updateThemeIcon(themeToggle, 'dark');
  } else {
    updateThemeIcon(themeToggle, 'light');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = rootElement.getAttribute('data-theme') === 'dark';
      
      if (isDark) {
        rootElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        updateThemeIcon(themeToggle, 'light');
      } else {
        rootElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon(themeToggle, 'dark');
      }
    });
  }
}

function updateThemeIcon(button, theme) {
  if (!button) return;
  
  if (theme === 'dark') {
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    `;
  } else {
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    `;
  }
}
