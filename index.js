const fs = require('fs')
const puppeteer = require('puppeteer');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

const SHOWNUMBER = 3709;

const url = "http://www.j-archive.com/showgame.php?game_id=" + SHOWNUMBER;

console.log("--FS PUP Tests, index.js, & puppet loaded--");

console.log("Attempting to initialize puppeteer");

var categories = [];
var clues = [];
var answers = [];
var correctContestants = [];
var incorrectContestants = [];
var show = "";
var csvrows = [];

try {
    (async () => {
        const browser = await puppeteer.launch();
        console.log("Browser loaded");
        const page = await browser.newPage();
        console.log("Page loaded");
        await page.goto(url);
        console.log("Page went to url", url);
        
        console.log("Attempting to scrape show");
        Csvrow.gameName = await page.evaluate( () => {
            let elment = document.getElementById("game_title").childNodes[0];
            let str = elment.innerHTML;
            //let si = str.indexOf(">");
            //let li = str.lastIndexOf("<");
            //return str.slice(si+1,li);
            return str;
        });
        console.log("Show retrieved: ", Csvrow.gameName);

        console.log("Attempting to scrape contestants");
        Csvrow.contestantReference = await page.evaluate( () => {
            let elements = document.getElementsByClassName("contestants");
            return Array.from(elements).map( (el) => {
                let str = el.innerHTML;
                let startIndex = str.indexOf(">");            
                let endIndex = str.lastIndexOf("<");
                let contestantFullName = str.slice(startIndex+1, endIndex);
                let jobStart = str.lastIndexOf(">");
                let job = str.slice(jobStart+1); 
                return {
                    "fullContestant":el.innerHTML,
                    "contestantFullName": contestantFullName,
                    "contestant": contestantFullName.split(" ")[0],
                    "job": job
                }
            })
        });

        console.log("Attempting to scrape categories");
        categories = await page.evaluate(() => {
            let elements = document.getElementsByClassName("category_name");
            return Array.from(elements).map( (el) => { return {"category":el.innerHTML,"round":"undef.","col":"undef"}} );
        });
        for(let n = 0; n < categories.length; n++) {
            if( n <= 5 ) {
                categories[n]["round"] = "J";
                categories[n]["col"] = (n+1);
            }
            else if( n <= 11 ) {
                categories[n]["round"] = "DJ";
                categories[n]["col"] = ((n%1)+1);
            }
            else {
                categories[n]["round"] = "FJ";
            }
        }
        let round1categories = categories.filter( (value, index, array) => value["round"] == "J");
        //console.log("J cats: " , round1categories);
        //console.log("J cats length: ", round1categories.length);
        let round2categories = categories.filter( (value, index, array) => value["round"] == "DJ");
        //console.log("DJ cats: " , round2categories);
        let finalcategories = categories.filter( (value, index, array) => value["round"] == "FJ");
        //console.log("Final: ", finalcategories);

        console.log("Attempting to scrape clues");
        clues = await page.evaluate(()=> {
            let elements = document.getElementsByClassName("clue_text");
            return Array.from(elements).map( (el) => { return {"location":el.id,"clue":el.innerHTML}} );
        });      
        //console.log("Clues retrieved: ", clues);

        console.log("Putting clues into csvRowArray, parsing them, assigning categories.");
        for(let y = 0; y < clues.length; y++ ) {
            //fills csvrow objects with correct 
            //console.log("y = ", y);
            csvrows[y] = new Csvrow();
            csvrows[y].loadClue(clues[y]);
            //console.log("csvrow[y] BEFORE ", csvrows[y]);
            if( csvrows[y].round == "J" ) {
                csvrows[y].category = round1categories[csvrows[y].col-1].category;
                //console.log("round1categories[y].category", round1categories[csvrows[y].col-1].category);
            }   
            else if( csvrows[y].round == "DJ") {
                csvrows[y].category = round2categories[csvrows[y].col-1].category;
                //console.log("round2categories[y].category", round2categories[csvrows[y].col-1].category);
            }   
            else {
                csvrows[y].category = finalcategories[0].category;               
            }
            //console.log("csvrow[y] AFTER",csvrows[y]);
        }



        //flip all the cards
        console.log("Attempting to mouse-over cards to flip and expose answers.");
        await page.evaluate(() => {
            let ch = document.getElementsByClassName("clue_header");
            for(let i = 0; i < ch.length; i++) {
                ch[i].parentNode.onmouseover();
            }            
        });
        await page.evaluate(() => {
            let cats = document.getElementsByClassName("category_name");
            cats[12].parentElement.parentElement.parentElement.parentElement.onmouseover(); 
        });

        console.log("Attempting to scrape answers.");
        answers = await page.evaluate( () => {
            return Array.from(document.getElementsByClassName("correct_response")).map( (elem) => { return {"location":elem.parentNode.id, "answer":elem.innerHTML}} );
        });
        //console.log("Answers retrieved: ", answers);
        Csvrow.fillAnswers(answers, csvrows);

        console.log("Attempting to scrape correct contestants.");
        correctContestants = await page.evaluate( () => {
            return Array.from(document.getElementsByClassName("right")).map( (elem) => {
                return {"location":elem.parentNode.parentNode.parentNode.parentNode.id,"contestant":elem.innerHTML}} );
        });
        //console.log("Correct contestants retrieved: ", correctContestants);
        console.log("Attempting to scrape incorrect contestants.");
        incorrectContestants = await page.evaluate( () => {
            return Array.from(document.getElementsByClassName("wrong")).map( (elem) => {
                return {"location":elem.parentNode.parentNode.parentNode.parentNode.id,"contestant":elem.innerHTML}} ).filter( (elem) => { return elem.contestant === "Triple Stumper"});
        });
        //console.log("Incorrect contestants retrieved: ", incorrectContestants);

        console.log("Joining correct contestants and Triple Stumpers");
        let concatContestants = correctContestants.concat(incorrectContestants);
        //console.log("Full contestants", concatContestants);
        console.log("Filling csvrows with corresponding contestants");
        Csvrow.fillContestants(concatContestants, csvrows);

        console.log("Turning to file string.")
        //console.log( Csvrow.makeFileString(csvrows));
        //console.log("Here are the csvrows retrieved:", csvrows);
        //console.log("Here is the final csvrow", csvrows[csvrows.length-1]);
        console.log("Saving file.");
        saveFile( "temp\jeopardy-round" + SHOWNUMBER + ".csv", Csvrow.makeFileString(csvrows));

        await browser.close();
        console.log("Browser closed");
    })()
} catch(err) {
    console.log("There was an error scraping!");
    console.error(err);
}

class Csvrow {

    static nums = 0;

    static gameName = " ";

    static contestantReference = [];

    constructor() {
        this.clue = "missing clue";
        this.answer = "missing answer";
        this.category = "missing category";
        this.value = " ";
        this.col = 0;
        this.row = 0;
        this.round = "FJ";
        this.contestant = "";
        Csvrow.nums++;
    }

    loadClue(pclue) {
        this.clue = pclue["clue"];
        let loc = pclue["location"].split("_");
        this.round = loc[1];
        if(this.round != "FJ") {
            this.col = parseInt(loc[2]);
            this.row = parseInt(loc[3]);
            if(this.round == "J") {
                this.value = this.row * 200;
            }
            else if(this.round == "DJ") {
                this.value = this.row * 400;
            }               
        }
    }

    static fillContestants(contestants, csvrowArray) {

        Csvrow.sortByScore(csvrowArray);
        //round column row
        let contestantsAligned = contestants.map( (element) => {
            let loc = element.location.split("_");
            return {"round":loc[1],"col":parseInt(loc[2]),"row":parseInt(loc[3]),"contestant":element.contestant}
        }); 
        Csvrow.sortByScore(contestantsAligned);

        //console.log(contestantsAligned);
        //console.log("Contestants length:", contestantsAligned.length);

        function* coughRow(csvrowArray) {
            for(let i = 0; i < csvrowArray.length; i++) {
                //console.log("coughing row: (round,col,row)", csvrowArray[i].round, csvrowArray[i].col, csvrowArray[i].row);
                yield csvrowArray[i];
            }
        }
        function* coughContestant(contestantsAligned) {
            for(let i = 0; i < contestantsAligned.length; i++) {
                //console.log("coughing cont: ", contestantsAligned[i]);
                yield contestantsAligned[i];
            }
        }
        const rowObjs = coughRow(csvrowArray);
        const contestantObjs = coughContestant(contestantsAligned);

        let contestantTest = contestantObjs.next();
        for(let i=0; i<contestants.length; i++) {
            //console.log(contestantTest.value.contestant, contestantTest.value.round, contestantTest.value.col, contestantTest.value.row);
            let rowTest = rowObjs.next();
            //console.log(rowTest.value.contestant, rowTest.value.round, rowTest.value.col, rowTest.value.row);
            //console.log("contestantTest is ", contestantTest);
            if( contestantTest.value.row == rowTest.value.row && contestantTest.value.col == rowTest.value.col) {
                //console.log("Match!");
                rowTest.value.contestant = contestantTest.value.contestant;
                //console.log("Rowtest: ", rowTest, "contestantTest: ", contestantTest);
                contestantTest = contestantObjs.next();
            }
            else {
                //console.log("No match!");
            }
        }

        for(let i = 0; i < csvrowArray.length; i++) {
            let test = csvrowArray[i].contestant;
            for(let j = 0; j < Csvrow.contestantReference.length; j++) {
                if( test == Csvrow.contestantReference[j].contestant) {
                    csvrowArray[i].contestant = Csvrow.contestantReference[j].contestantFullName + Csvrow.contestantReference[j].job;
                }               
            }
        }

        //console.log(csvrowArray);
    }



    static fillAnswers(answers, csvrowArray) {
        //console.log("Static method Fill answers called");
        //console.log("answers[0] = ", answers[0]);
        //console.log("answers[last] = ", answers[answers.length-1]);

        answers = answers.map( (answer) => {
            let ansar = answer.location.split("_");
            let r = ansar[1];
            let c = parseInt(ansar[2]);
            let row = parseInt(ansar[3]);

            return {"round":r,"col":c,"row":row,"answer":answer.answer};
        });
        //console.log(answers);
        Csvrow.sortByScore(answers);
        Csvrow.sortByScore(csvrowArray);

        for(let y = 0; y < answers.length; y++) {
            csvrowArray[y].answer = answers[y].answer;
        }

        //csvrowArray.forEach( (ea) => { console.log(ea.round, ea.col, ea.row);})
        //console.log(answers);
        //console.log("Csv row array: ", csvrowArray);
        //console.log("Csv select", csvrowArray.map( (ele) => { return {"round":ele.round,"col":ele.col,"row":ele.row,"answer":ele.answer}}))
        console.log(Csvrow.nums, "csvrows have been created");
    }
    static sortByScore(csvrowArray) {
        
        csvrowArray.sort( (a,b) => {
 
            function roundScore(round) {
                if(round == 'J') {
                    return 100;
                }
                else if(round == 'DJ') {
                    return 200;
                }
                else {
                    return 300;
                }
            }
            //console.log("a",a,"b",b)
            let aval = roundScore(a.round) + a.col*10 + a.row*1;
            let bval = roundScore(b.round) + b.col*10 + b.row*1;
            //console.log("a is - ", a.round, a.col, a.row, " - aval is - ", aval);
            //console.log("b is - ", b.round, b.col, b.row, " - bval is - ", bval);
            if( aval < bval ) { return -1}
            else if( bval < aval ) { return 1 }
            else if ( aval == bval ) {return 0}  
        });

        //console.log("last elm sorted:",csvrowArray[csvrowArray.length - 1]);

    }

    static makeFileString(csvRowArray) {
        let stringArray = csvRowArray.map( (csvrow) => {
            return csvrow.clue + "~" + csvrow.answer + "~" + csvrow.category + "~" + csvrow.value + "~" + csvrow.round + "~" + csvrow.contestant + "~" + Csvrow.gameName;
        });
        return stringArray.join("\n");

    }
}

function saveFile(path, bigstring) {
    try {
        fs.writeFileSync(path, bigstring);
    }
    catch(ex) {
        console.log("Error writing file! ", ex);
    } 
}

console.log("This code is out of the async func");

// write to file
/* */