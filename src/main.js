let openbtn = document.querySelector('.bi-list');
let closeBtn = document.querySelector('.bi-x-lg');
let menu = document.querySelector('.navbar__menu');

openbtn.addEventListener("click", () => {
  openbtn.classList.toggle("hide")
  closeBtn.classList.toggle("hide");
  menu.classList.toggle("hidden");
});

closeBtn.addEventListener("click", () => {
  openbtn.classList.toggle("hide")
  closeBtn.classList.toggle("hide");
  menu.classList.toggle("hidden");
});

