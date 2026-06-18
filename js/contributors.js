// js/contributors.js

export function initContributors(experimentData) {
  const toggleBtn = document.getElementById('contributors-btn');
  const contentSection = document.getElementById('contributors-content');
  const gridSection = document.getElementById('contributors-grid');
  
  if (!toggleBtn || !contentSection || !gridSection) return;

  // Render Contributors
  if (!experimentData.contributors || experimentData.contributors.length === 0) {
    gridSection.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No contributors listed yet.</p>';
  } else {
    gridSection.innerHTML = experimentData.contributors.map(contributor => {
      let btnLabel = 'Visit Profile';
      let btnHref = '';
      let btnAttr = '';
      let btnClass = 'btn contributor-btn';
      
      if (contributor.portfolio) {
        btnHref = `href="${contributor.portfolio}" target="_blank" rel="noopener noreferrer"`;
      } else if (contributor.linkedin) {
        btnHref = `href="${contributor.linkedin}" target="_blank" rel="noopener noreferrer"`;
      } else {
        btnLabel = 'Profile Coming Soon';
        btnAttr = 'disabled';
        btnHref = 'as="button"';
      }
      
      const elType = btnHref.startsWith('href') ? 'a' : 'button';

      return `
        <div class="contributor-card">
          <div class="contributor-img">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h3 class="contributor-name">${contributor.name}</h3>
          <p class="contributor-role">${contributor.role}</p>
          <${elType} ${btnHref} ${btnAttr} class="${btnClass}">${btnLabel}</${elType}>
        </div>
      `;
    }).join('');
  }

  // Accordion Toggle Logic
  toggleBtn.addEventListener('click', () => {
    const isOpen = contentSection.classList.contains('open');
    if (isOpen) {
      contentSection.classList.remove('open');
      toggleBtn.innerHTML = `View Contributors <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;
    } else {
      contentSection.classList.add('open');
      toggleBtn.innerHTML = `Hide Contributors <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>`;
    }
  });
}
