const puppeteer = require('puppeteer');

//the url parameter directing scraping to a specific jeopardy game
const game_id = 2539;

const url = "http://www.j-archive.com/showgame.php?game_id=" + game_id;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await browser.close();
})