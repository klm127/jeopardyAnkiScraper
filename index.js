const fs = require('fs')
const puppeteer = require('puppeteer');
const jsdom = require("jsdom");
const {JSDOM} = jsdom;


//change this value to the number corresponding to game id of show page which you wish to scrape.
const game_id = 2539;


// build the url from the game id
const url = "http://www.j-archive.com/showgame.php?game_id=" + game_id;
// this is where .csv files will be saved.
const saveLocation = "rounds\jeopardy-round" + game_id + ".csv"; 

/** this try/async block uses puppeteer to scrape the given url */
console.log("starting.");

//these are the data structures we will use for processing the html data into objects

class gameClue {
    constructor() {
        this.contestant = "";
        this.value = "0";
        this.category = "no cat";
        this.clue = "no clue";
        this.answer = "no answer";
    }

    processUnflipped(tdClue) { //parameter is a td element of class clue

    }
    processFlipped(tdClue) { //parameter is a td element of class clue        
    }
}

//parses the HTML for each round
class gameRound {
    constructor(roundType) {
        this.round = roundType;
        this.unflippedRawHTML = "";
        this.flippedRawHTML = "";
        this.categories = [];
        this.row200 = [];
        this.row400 = [];
        this.row600 = [];
        this.row800 = [];
        this.row1000 = [];
    }
    parse() {
        this.parseUnflipped();
        this.parseFlipped();
    }
    parseUnflipped() {
        let dom = new JSDOM(this.unflippedRawHTML);
        this.unflippedRawHTML = "";
        let document = dom.window.document;
        let cats = document.getElementsByClassName("category_name");
        for(let i = 0; i < cats.length; i++) {
            this.categories[i] = cats[i].innerHTML;
        }
    }
    parseFlipped() {
        this.flippedRawHTML = "";
    }
}

//asynchronously gets the raw HTML and puts it in the gameRound objects
class gameParser {

    static singleJeopardy = new gameRound("SJ");
    static doubleJeopardy = new gameRound("DJ");
    static finalJeopardy = new gameRound("FJ");

    static async parse(page) {
        gameParser.singleJeopardy.unflippedRawHTML = await page.evaluate( () => {
            let jround = document.getElementById("jeopardy_round");
            return jround.innerHTML;
        });
        // mouse over elements to flip them
        await page.evaluate(() => {
            let ch = document.getElementsByClassName("clue_header");
            for(let i = 0; i < ch.length; i++) {
                ch[i].parentNode.onmouseover();
            }            
        });
        gameParser.singleJeopardy.flippedRawHTML = await page.evaluate( () => {
            let jround = document.getElementById("jeopardy_round");
            return jround.innerHTML;
        });
    }
    static process() {
        gameParser.singleJeopardy.parse();
    }
}

//puppeteer, uses gameParser to parse the page
try {
    (async () => {
        //instruct puppeteer to go to the webpage of the game.
        const browser = await puppeteer.launch();
        console.log("Browser loaded");
        const page = await browser.newPage();
        console.log("Page loaded");
        await page.goto(url);
        console.log("Page went to url", url);        
        console.log("Attempting to scrape show");

        await gameParser.parse(page);
        await browser.close();
        gameParser.process();
        console.log(gameParser);
        console.log("Browser closed");
    })()
} catch(err) {
    console.log("There was an error scraping!");
    console.error(err);
}
