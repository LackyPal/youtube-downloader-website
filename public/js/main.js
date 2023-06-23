//format contentLength size
function formatSize(size) {
  const units = ["B", "KB", "MB", "GB"];
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}