const fs = require('fs');
const files = [
  './components/AdminSettings.tsx',
  './components/Login.tsx',
  './components/HistoryItemCard.tsx',
  './components/ImageGenerator.tsx',
  './components/LoadingSpinner.tsx',
  './components/ImageUploader.tsx',
  './components/ChatWidget.tsx',
  './components/PhotoEditor.tsx',
  './App.tsx',
  './index.html'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/green-300/g, 'pink-300');
    content = content.replace(/green-400/g, 'pink-400');
    content = content.replace(/green-500/g, 'pink-500');
    content = content.replace(/green-600/g, 'pink-600');
    content = content.replace(/green-700/g, 'pink-700');
    
    content = content.replace(/teal-400/g, 'purple-400');
    content = content.replace(/teal-500/g, 'purple-500');
    content = content.replace(/teal-600/g, 'purple-600');

    // Make backgrounds softer dark pink/purple instead of dark blue/gray if we want, but keeping it simple is safer
    fs.writeFileSync(file, content);
  } else {
    console.log("File not found: " + file);
  }
});
console.log('Recolor done!');
