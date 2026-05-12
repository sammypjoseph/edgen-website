const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
const toast = document.getElementById('toast');

navToggle?.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));

function showToast(message = 'Demo only. Nothing was submitted.') {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    showToast('Demo only. Nothing was submitted or stored.');
  });
});

document.querySelectorAll('.link-button').forEach(button => {
  button.addEventListener('click', () => showToast('Demo download placeholder. No file is connected yet.'));
});

const otherAmount = document.querySelector('.other-amount');
document.querySelectorAll('.amounts button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.amounts button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    if (button.dataset.amount === 'other') {
      otherAmount.hidden = false;
      otherAmount.focus();
    } else {
      otherAmount.hidden = true;
      otherAmount.value = '';
    }
  });
});
