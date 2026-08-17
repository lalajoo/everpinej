// Scroll reveal
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// iPhone / iPad toggle for feature screenshots
document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode; // "phone" | "pad"
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".js-device").forEach((fig) => {
      const img = fig.querySelector("img");
      if (img.dataset[mode]) img.src = img.dataset[mode];
      fig.classList.toggle("device-phone", mode === "phone");
      fig.classList.toggle("device-pad", mode === "pad");
    });
  });
});

// FAQ: close others when one opens
document.querySelectorAll(".faq details").forEach((d) => {
  d.addEventListener("toggle", () => {
    if (d.open) {
      document.querySelectorAll(".faq details[open]").forEach((o) => {
        if (o !== d) o.open = false;
      });
    }
  });
});
