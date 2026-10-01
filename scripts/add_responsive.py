import re

with open('css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add responsive improvements at the end of the file
responsive_fixes = '''

/* ========== RESPONSIVE IMPROVEMENTS ========== */

@media (max-width: 1200px) {
  .container { padding: 0 20px; }
  .hero-content h1 { font-size: 2.5rem; }
}

@media (max-width: 992px) {
  .hero .container { grid-template-columns: 1fr; text-align: center; }
  .hero-visual { order: -1; }
  .hero-content { text-align: center; }
  .hero-buttons { justify-content: center; }
  .navbar-nav { display: none; }
  .hamburger { display: flex; }
  .hero-content h1 { font-size: 2.5rem; }
}

@media (max-width: 768px) {
  .container { padding: 0 16px; }
  .hero { padding: 60px 0 0; }
  .hero-content h1 { font-size: 2rem; }
  .hero-description { font-size: 1rem; }
  .hero-buttons { flex-direction: column; width: 100%; }
  .hero-buttons .btn-primary,
  .hero-buttons .btn-outline { width: 100%; justify-content: center; }
  .section-heading h2 { font-size: 1.8rem; }
  .services-grid { grid-template-columns: 1fr; }
  .grid-cards { grid-template-columns: 1fr; }
  .testimonials-grid { grid-template-columns: 1fr; }
  .why-grid { grid-template-columns: 1fr; }
  .hero-stats { gap: 0; }
  .stat-item { padding: 0 16px; }
  .stat-number { font-size: 1.8rem; }
  .navbar-nav { display: none; }
  .hamburger { display: flex; }
}

@media (max-width: 480px) {
  .container { padding: 0 12px; }
  .hero { padding: 40px 0 0; }
  .hero-content h1 { font-size: 1.75rem; }
  .hero-buttons { gap: 10px; }
  .btn-primary,
  .btn-outline { padding: 14px 20px; font-size: 0.95rem; }
  .hero-stats { flex-wrap: wrap; gap: 16px; }
  .stat-item { padding: 0 8px; }
  .stat-number { font-size: 1.5rem; }
  .section-heading h2 { font-size: 1.5rem; }
  .info-card { padding: 20px 16px; }
  .btn-primary,
  .btn-outline { padding: 12px 20px; font-size: 0.95rem; }
}

@media (max-width: 320px) {
  .container { padding: 0 12px; }
  .hero-content h1 { font-size: 1.5rem; }
  .btn-primary,
  .btn-outline { padding: 12px 16px; font-size: 0.875rem; }
  .hero-stats { gap: 8px; }
  .stat-item { padding: 0 4px; }
  .btn-primary,
  .btn-outline { padding: 12px 16px; font-size: 0.875rem; }
  .hero-stats { gap: 8px; }
  .stat-item { padding: 0 4px; }
  .btn-primary,
  .btn-outline { padding: 12px 16px; font-size: 0.875rem; }
</style>
'''

with open('css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

insert_pos = css.find('/* ========== TOP BAR ==========')
if insert_pos > 0:
    css = css[:insert_pos] + responsive_fixes + '\n' + css[insert_pos:]

with open('css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
print('Added responsive improvements')