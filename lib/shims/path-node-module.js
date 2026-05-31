function normalize(filePath) {
  return String(filePath).replace(/\/+/g, "/");
}

function dirname(filePath) {
  const normalized = normalize(filePath);
  const slashIndex = normalized.lastIndexOf("/");

  return slashIndex > 0 ? normalized.slice(0, slashIndex) : ".";
}

module.exports = {
  dirname,
  normalize,
};
