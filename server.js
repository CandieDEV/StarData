require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname +'/Pub'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

const { readFile } = require('fs/promises');
async function content(path) {  
  const text = await readFile(path, 'utf8')
  console.log(text)
  return text
}

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/license', async (req, res) => {
  let licenseTXT = await content('./LICENSE');
  licenseTXT = licenseTXT.replace(/<([^>]+)>/g, (match, content) => {
    if (/^(https?:\/\/|www\.)/i.test(content)) {
      return `<a href="${content}">${content}</a>`;
    } else {
      return ``;
    }
  });
  licenseTXT = licenseTXT.replace(/ {5,}(\S+)/g, '<span class="licenseSubtitle">$1</span>');
  res.render('license', {licenseTXT})
})

// Start server
const PORT = process.env.PORT || 8883;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));