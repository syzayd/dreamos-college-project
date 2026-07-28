// leftover helper from an earlier React experiment, unrelated to DreamOS
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

module.exports = { debounce };
