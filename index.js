/* ~~  Jeopardy Anki Scraper  ~~
 *
 * Scrapes a page on j-archive.com for data about a jeopardy game. Stores the data in a .csv
 * compatibile with Anki flashcard program. Anki is available at available at apps.ankiweb.net.
 *
 * Created by klm127 in 2020 for the purposes of learning more about javascript, scraping, and
 * to get better at jeopardy and trivia generally. 
*/

const fs = require('fs') // for csv read/writing
const puppeteer = require('puppeteer'); // headless chromium browser for scraping
const jsdom = require("jsdom"); // turns raw html into simulated elements similar to DOMParser
const { exception } = require('console');
const { Z_UNKNOWN } = require('zlib');
const {JSDOM} = jsdom;

//change this value to the number corresponding to game id in the url of show page which you wish to scrape.
const GAME_ID = 2539;

//the character which will delimit fields in the .csv. It will be removed from strings prior to being put in csv
const DELIMITER = ';'

// this is where .csv files will be saved.
const SAVEPATH = "rounds/jeopardy-round" + GAME_ID + ".csv"; 

const URL = "http://www.j-archive.com/showgame.php?game_id=" + GAME_ID;


console.log("starting.");

//these are the data structures we will use for processing the html data into objects
class gameClue {
    constructor() {
        this.round = 'NJ';
        this.order = "0";
        this.value = "0";
        this.category = "no cat";
        this.clue = "no clue";
        this.correct_response = "no answer"; // dont change this default as its the filter
        this.contestant = "no contestant";
    }

    parseUnflipped(tdClue) { //parameter is a td element of class clue
        try {
            this.clue = tdClue.getElementsByClassName("clue_text")[0].innerHTML;
        } catch(err) {
            console.log("couldn't find clue text");
            this.clue = "no clue";
        }
        try {
            this.order = tdClue.getElementsByClassName("clue_order_number")[0].childNodes[0].innerHTML;
        } catch (err) {
            console.log("couldn't find clue order number");
            this.order = "0";
        }
    }
    parseFlipped(tdClue) { //parameter is a td element of class clue
        try {
            this.correct_response = tdClue.getElementsByClassName("correct_response")[0].innerHTML;
        } catch(err) {
            console.log("couldn't find correct response");
            this.correct_response = "no answer";
        }
        try {
            this.contestant = tdClue.getElementsByClassName("right")[0].innerHTML;
        } catch(err) {
            console.log("couldn't correct contestant, possible triple stumper");
            this.contestant = "Triple Stumper";
        }
    }
    toCSVstring(dc) { //dc is the delimiting character between csv fields. Comma not recommended
        return this.round + dc + this.order + dc + this.value + dc + this.clear(this.category, dc) + dc + this.clear(this.clue, dc) + dc + this.clear(this.correct_response, dc) + dc + this.clear(this.contestant,dc);
    }
    clear(str_prop, delim_char) { 
        return str_prop.replace(delim_char, '');
    }
}

class gameContestant {
    constructor() {
        this.shortname = "no name";
        this.fullnameandjob = "full name";
        this.totalscore = "0"; // need to impliment
    }
}

class contestantParser {
    constructor() {
        this.contestants = [];
        this.contestants[0] = new gameContestant();
        this.contestants[1] = new gameContestant();
        this.contestants[2] = new gameContestant();
        this.introRawHTML = "";
        this.scoreRawHTML = "";
    }
    parse() {
        this.parseIntroHTML();
        this.parseScoreHTML();
    }
    parseIntroHTML() {
        let dom = new JSDOM(this.introRawHTML);
        this.introRawHTML = "";
        let document = dom.window.document;
        let contestantElems = document.getElementsByClassName("contestants");
        for(let i = 0; i < contestantElems.length; i++) {
            this.contestants[i].fullnameandjob = contestantElems[i].innerHTML;
            this.contestants[i].shortname = contestantElems[i].childNodes[0].innerHTML.split(' ')[0];
        }
    }
    parseScoreHTML() {
        let dom = new JSDOM(this.scoreRawHTML);
        this.scoreRawHTML = "";
        let document = dom.window.document;  
        let elemnames = document.getElementsByClassName("score_player_nickname");

        // unsure why this isn't working but it could be an issue with the JSDOM library. 

        let elemscores = document.getElementsByClassName("score_positive");
        let name_score = [];
        for(let i = 0; i < elemnames.length; i++) {
            name_score[i] = {name:elemnames[i].innerHTML, score:elemscores[i].innerHTML};
        }
        for(let i = 0; i < name_score.length; i++) {
            for(let j = 0; j < this.contestants.length; j++ ) {
                if( name_score[i].name == this.contestants[j].shortname) {
                    this.contestants[j].totalscore = name_score[i].score;
                }
            }
        }
        //class score_player_nickname and score_positive
    }
    getFullName(aName) {
        let s = '';
        for( let i = 0; i < this.contestants.length; i ++ ) {
            if (this.contestants[i].shortname = aName) {
                return this.contestants[i].fullnameandjob;
            }
        }
        return "unknown";
    }
}
//parses the HTML for each round, holds categories and clues, adds categories and values to clues
class gameRound {
    constructor(roundType) {
        this.round = roundType;
        this.unflippedRawHTML = "";
        this.flippedRawHTML = "";
        this.categories = [];
        this.rows = [];
    }
    parse() {
        if(this.round == "FJ") {
            this.parseUnflippedFinal();
            this.parseFlippedFinal();
        }
        else {
            this.parseUnflipped();
            this.parseFlipped();
        }
    }
    parseUnflippedFinal() {
        let dom = new JSDOM(this.unflippedRawHTML);
        this.unflippedRawHTML = "";    
        let document = dom.window.document;    
        let cats = document.getElementsByClassName("category_name");
        for(let i = 0; i < cats.length; i++) {
            this.categories[i] = cats[i].innerHTML;
        }
        let row = document.firstChild;
        this.parseRowUnflipped(row);
    }
    parseFlippedFinal() {
        let dom = new JSDOM(this.flippedRawHTML);
        this.flippedRawHTML = "";    
        let document = dom.window.document;
        let row = document.firstChild;
        this.parseRowFlipped(row);
    }
    parseUnflipped() {
        let dom = new JSDOM(this.unflippedRawHTML);
        this.unflippedRawHTML = "";
        let document = dom.window.document;
        let cats = document.getElementsByClassName("category_name");
        for(let i = 0; i < cats.length; i++) {
            this.categories[i] = cats[i].innerHTML;
        }
        let allrows = document.getElementsByClassName("round")[0].childNodes[1].childNodes;
        this.parseRowUnflipped(allrows[2],0);
        this.parseRowUnflipped(allrows[4],1);
        this.parseRowUnflipped(allrows[6],2);
        this.parseRowUnflipped(allrows[8],3);
        this.parseRowUnflipped(allrows[10],4);
    }
    parseFlipped() {
        let dom = new JSDOM(this.flippedRawHTML);
        this.flippedRawHTML = "";
        let document = dom.window.document;
        let allrows = document.getElementsByClassName("round")[0].childNodes[1].childNodes;
        this.parseRowFlipped(allrows[2],0);
        this.parseRowFlipped(allrows[4],1);
        this.parseRowFlipped(allrows[6],2);
        this.parseRowFlipped(allrows[8],3);
        this.parseRowFlipped(allrows[10],4);
    }
    parseRowUnflipped(tr, rowIndex) { //parameter is a tr containing tds of class clue
        let cluesRaw = tr.getElementsByClassName("clue");
        let clues = [];
        for(let i = 0; i < cluesRaw.length; i++) {
            let newClue = new gameClue();
            newClue.parseUnflipped(cluesRaw[i]);
            clues[i] = newClue;
        }
        this.rows[rowIndex] = clues;
    }
    parseRowFlipped(tr, rowIndex) {
        let cluesRaw = tr.getElementsByClassName("clue");
        let clues = this.rows[rowIndex];
        for(let i = 0; i < cluesRaw.length; i++) {
            clues[i].parseFlipped(cluesRaw[i]);
        }
        this.rows[rowIndex] = clues;
    }
    addGameInfoToClues(contestantParser) {
        let newclues = [];
        //add categories to clues, then add clue values to clues
        this.rows.forEach( (row,rowindex) => {
            row.forEach( (clue, columnindex) => {
                clue.round = this.round;
                clue.value = this.getClueValue(rowindex);
                clue.category = this.categories[columnindex];
                if( clue.correct_response != "no answer") {
                    newclues.push(clue);
                }
                clue.contestant = contestantParser.getFullName(clue.contestant);
            });
        });
        newclues.sort( (a,b) => {
            if (+a.order < +b.order) { return -1;}
            if (+a.order > +b.order) { return 1; }
            return 0;
        });
        this.rows = newclues;
    }
    getClueValue(rowindex) {
        if(this.round == "FJ") {
            return "$5000";
        }
        else if(this.round == "SJ") {
            return "$" + `${(rowindex+1) * 200}`;
        }
        else {
            return "$" + `${(rowindex+1) * 400}`;
        }
    }
    toCSVstring(dc) { //dc is delimiting character, for passing through to clues
        let largestring = '';
        this.rows.forEach( (clue) => {
            largestring += clue.toCSVstring(dc) + '\n';
        });
        return largestring;
    }
}

//asynchronously gets the raw HTML and puts it in the gameRound objects
class gameParser {

    static singleJeopardy = new gameRound("SJ");
    static doubleJeopardy = new gameRound("DJ");
    static finalJeopardy = new gameRound("FJ");
    static contestantParser = new contestantParser();
    static gameName;

    static async parse(page) {
        gameParser.gameName = await page.evaluate( () => {
            return document.getElementById("game_title").childNodes[0].innerHTML;
        });

        gameParser.contestantParser.introRawHTML = await page.evaluate( () => {
            let jbox = document.getElementById("contestants_table");
            return jbox.innerHTML;
        });
        gameParser.singleJeopardy.unflippedRawHTML = await page.evaluate( () => {
            let jround = document.getElementById("jeopardy_round");
            return jround.innerHTML;
        });
        gameParser.finalJeopardy.unflippedRawHTML = await page.evaluate( () => {
            let jround = document.getElementById("final_jeopardy_round");
            return jround.innerHTML;
        });
        // mouse over elements to flip them
        await page.evaluate(() => {
            let ch = document.getElementsByClassName("clue_header");
            for(let i = 0; i < ch.length; i++) {
                ch[i].parentNode.onmouseover();
            }
            document.getElementById("final_jeopardy_round").getElementsByClassName("category")[0].childNodes[1].onmouseover();
        });
        gameParser.singleJeopardy.flippedRawHTML = await page.evaluate( () => {
            let jround = document.getElementById("jeopardy_round");
            return jround.innerHTML;
        });
        gameParser.finalJeopardy.flippedRawHTML = await page.evaluate( () => {
            let jround = document.getElementById("final_jeopardy_round");
            return jround.innerHTML;
        });
        gameParser.contestantParser.scoreRawHTML = await page.evaluate( () => {
            let jbox = document.getElementsByClassName("score_player_nickname")[9].parentNode.parentNode.parentNode;
            return jbox.innerHTML;
        });
    }
    static process() {
        gameParser.singleJeopardy.parse();
        gameParser.finalJeopardy.parse();
        gameParser.contestantParser.parse();
        gameParser.singleJeopardy.addGameInfoToClues(this.contestantParser);
        gameParser.finalJeopardy.addGameInfoToClues(this.contestantParser);
    }
    static toCSVstring(delim_char) {
        return gameParser.singleJeopardy.toCSVstring(delim_char) + 
                gameParser.doubleJeopardy.toCSVstring(delim_char) +
                gameParser.finalJeopardy.toCSVstring(delim_char);
    }
}

//puppeteer, uses gameParser static class to parse the page
try {
    (async () => {
        //instruct puppeteer to go to the webpage of the game.
        const browser = await puppeteer.launch();
        console.log("Browser loaded");
        const page = await browser.newPage();
        console.log("Page loaded");
        await page.goto(URL);
        console.log("Page went to url", URL);        
        console.log("Attempting to scrape show");

        await gameParser.parse(page);
        await browser.close();
        gameParser.process();
        let filetext = gameParser.toCSVstring(DELIMITER);
        saveFile(SAVEPATH, filetext);
        //console.log(gameParser.singleJeopardy);
        console.log("Browser closed");
    })()
} catch(err) {
    console.log("There was an error scraping!");
    console.error(err);
}


function saveFile(path, bigstring) {
    try {
        fs.writeFileSync(path, bigstring);
    }
    catch(ex) {
        console.log("Error writing file! ", ex);
    } 
}