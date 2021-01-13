const fs = require('fs')
const puppeteer = require('puppeteer');
const jsdom = require("jsdom");
const { exception } = require('console');
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
        this.contestant = "no contestant";
        this.order = "0";
        this.value = "0";
        this.category = "no cat";
        this.clue = "no clue";
        this.correct_response = "no answer";
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
        this.contestants.foreach( c => {
            if(c.shortname == aName) {
                return c.fullnameandjob;
            } 
        });
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
        this.addGameInfoToClues();
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
    addGameInfoToClues() {
        //add categories to clues, then add clue values to clues
        this.rows.forEach( (row,rowindex) => {
            row.forEach( (clue, columnindex) => {
                clue.value = this.getClueValue(rowindex);
                clue.category = this.categories[columnindex];
            });
        });
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
        await page.goto(url);
        console.log("Page went to url", url);        
        console.log("Attempting to scrape show");

        await gameParser.parse(page);
        await browser.close();
        gameParser.process();
        console.log(gameParser.finalJeopardy);
        console.log("Browser closed");
    })()
} catch(err) {
    console.log("There was an error scraping!");
    console.error(err);
}
