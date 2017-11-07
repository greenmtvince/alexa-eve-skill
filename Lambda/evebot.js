/**
 * This is the lambda for the EVE Aura skill.  Final naming and invocation to be determined.
 **/

'use strict';

const Alexa = require('alexa-sdk');

// 1.Strings =======================================================================================================
const APP_ID = "amzn1.ask.skill.3d8b329b-813e-42f4-882f-8ec4d75f8bea";

const languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: "EVE Aura",
            GET_FACT_MESSAGE: "Here's your fact: ",
            HELP_MESSAGE: "Say Intel, for an intel report on your location.  News for a list of the most recent EVE stories. Location, for current location.  Last kill, for info on the last kill in system.",
            HELP_REPROMPT: "What can I help you with?",
            STOP_MESSAGE: "Goodbye!",
            SALUTATION: "Hello ",
            WELCOME_MSG: ".  If you'd like an intel report on your current location, say Intel. If you'd like to hear the top stories, say News.  If you want more options, say Help. ",
            LOCATION_MSG: "You are presently located in ",
            LASTKILL_MSG: "The last kill here occured ",
            LASTKILL_TIME_ADVERB: " ago.",
            UNIT_DAYS: "Days",
            UNIT_HOURS: "Hours",
            UNIT_MINUTES: "Minutes"
        },
    },
    /*'en-GB': {
        translation: {
            SKILL_NAME: 'Eve Aura',
        },
    },
    'de-DE': {
        translation: {
            SKILL_NAME: 'Eve Aura auf Deutsch',
        },
    },*/
};
// 2. Session Objects ====================================================================================================

var myToken = "bob";
var charID = "";
var systemID = "";
/*var lastKillmail;
var wormholeSystem;
var newsFeed;
var sessionState = {
   "Authtoken" : "",
   "Character" : "",
   "SessionState":"",
   "StoryNumber": -1,
   "Location" : "30000142",
   "Character" : ""
}  */

var myAPI = {
    host: "",
    port: 443,
    path: "",
    method: 'GET',
    headers: {
        "User-Agent": "eve-Aura-Alexa",
    }
};

// 3. Skill Code =======================================================================================================

 exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context); 
    myToken = event.session.user.accessToken;
    console.log(myToken); 
    console.log(event);
    alexa.appId = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function () {
       var charData;
       getCharacter(myResp=>{
           charData = JSON.parse(myResp);
           var charName = charData.CharacterName;
           var charfirstName = "Capsuleer";
           if (charName != "" || charName != null)
           {
               if (charName.indexOf("CCP")==-1){
                   charfirstName = charName.split(" ");
                   charfirstName = charfirstName[0];
               }   
               else
                   charfirstName = charName;   
           }
           var launchMsg = this.t('SALUTATION') + charfirstName + this.t('WELCOME_MSG');
           this.emit(':tell', launchMsg);
       });
    },
    'location': function (){
       getCharacter(myResp=>{
           var charData = JSON.parse(myResp);
           charID = charData.CharacterID;
           getLocation(locationResponse=>{
               var locationMsg = this.t('LOCATION_MSG') + locationResponse;
               this.emit(':tell', locationMsg);
           });
       });
    },
    'lastKill': function (){
       getCharacter(myResp=>{
           var charData = JSON.parse(myResp);
           charID = charData.CharacterID;
           getLocation(locationResponse=>{

               getLastKill(zKillResponse=>{
                   var lastKillMsg = this.t('LASTKILL_MSG');

                   if (zKillResponse.D > 0)
                       lastKillMsg = lastKillMsg + zKillResponse.D + " "+this.t('UNIT_DAYS')+",";
                   if (zKillResponse.H > 0)
                       lastKillMsg = lastKillMsg + zKillResponse.H + " "+this.t('UNIT_HOURS')+",";
                   if (zKillResponse.M > 0)
                       lastKillMsg = lastKillMsg + zKillResponse.M + " "+this.t('UNIT_MINUTES');

                   lastKillMsg = lastKillMsg + this.t('LASTKILL_TIME_ADVERB');
                            
                   this.emit(':tell', lastKillMsg);
               });
           });
       });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

// 4. Helper Functions =======================================================================================================

//Get the Character ID of the current user
function getCharacter(callback){
   myAPI.host= "login.eveonline.com";
   myAPI.path="/oauth/verify";
   myAPI.headers.Authorization = "Bearer " +myToken;

   var response = apiCall(myAPI, myResponse=>{
       callback(myResponse);
   });
}

//Get the Location ID of the current user
function getLocation(callback){
    myAPI.host= "esi.tech.ccp.is";
    myAPI.path='/latest/characters/'+charID+'/location/?datasource=tranquility';
    myAPI.headers.Authorization = "Bearer " +myToken;

   apiCall(myAPI, myResponse=>{
       console.log("SYS_DATA"+myResponse);
       var solarSystem = JSON.parse(myResponse);
       systemID = solarSystem.solar_system_id;
       getSystemName(nameRes=> {
           callback(nameRes);
       });  
   });
}

//Use the location ID to retrieve the system name
function getSystemName(callback){
    myAPI.host= "esi.tech.ccp.is";
    myAPI.path='/latest/universe/systems/'+systemID+'/?datasource=tranquility';

   var response = apiCall(myAPI, myResponse=>{
       console.log("SYS_NAME"+myResponse)
       var jsonObj = JSON.parse(myResponse);
       callback(jsonObj.name);
   });
}


//Calls the ZKillboard API to get the list of killmails for the current system, then returns an 
//object with Days, Hours, and Minutes since the most recent kill in system.
function getLastKill(callback){
    myAPI.host= "zKillboard.com";
    myAPI.path='/api/kills/system/' +systemID+'/limit/50/orderDirection/desc/';

   apiCall(myAPI, zresponse=>{
       var stringResp = "{\"results\": " + zresponse + "}";
       var kills = JSON.parse(stringResp);
       var lastKillDate = Date.parse(kills.results[0].killmail_time);
       var timeNow = Date.now();
       var timeSinceKill = timeNow - lastKillDate;
       var totalTime = deltaTimeToString(timeSinceKill);
       callback(totalTime);
   });
}

//This takes a difference in time or timespan in milliseconds and converts it to a string stating 
//Days hours and minutes in the difference.  
function deltaTimeToString(deltaT)
{
   var sayOut = "";
   const oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
   const oneHour = 60*60*1000; //minutes*seconds*milliseconds
   const oneMinute = 60*1000; //seconds*milliseconds
   var daysSec = 0;
   var hoursSec = 0;
   var minutesSec = 0;
   var days = 0;
   var hours = 0;
   var minutes = 0;

   if (deltaT>oneDay){ 
       days = Math.floor(Math.abs(deltaT/oneDay));
   }
   if (deltaT>oneHour){
       hours = Math.floor(Math.abs((deltaT-(days*oneDay))/oneHour));
   }  
   minutes = Math.floor(Math.abs((deltaT-(days*oneDay)-(hours*oneHour))/oneMinute));

   var totalTime = {
       D: days,
       H: hours,
       M: minutes
   };
   return totalTime;
}

//This makes all the external API calls.
function apiCall(uri, callback){
   var https = require('https');

   var req=  https.request(uri , res =>{
       res.setEncoding('utf8');
       var returnData="";

       res.on('data', chunk => {
           returnData = returnData + chunk;
       });

       req.on('error', (e) => {
           console.error(e);
         });

       res.on('end', () =>{
           callback(returnData);
       });
   });
   req.end();
}

/*
function supportsDisplay() {
 var hasDisplay =
   this.event.context &&
   this.event.context.System &&
   this.event.context.System.device &&
   this.event.context.System.device.supportedInterfaces &&
   this.event.context.System.device.supportedInterfaces.Display

 return hasDisplay;
}

function isSimulator() {
 var isSimulator = !this.event.context.System.apiEndpoint; //simulator doesn't send apiEndpoint
 return isSimulator;
}

function renderTemplate (content) {

 //create a template for each screen you want to display.
 //This example has one that I called "factBodyTemplate".
 //define your templates using one of several built in Display Templates
 //https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/display-interface-reference#display-template-reference


  switch(content.templateToken) {
      case "factBodyTemplate":
         // for reference, here's an example of the content object you'd
         // pass in for this template.
         //  var content = {
         //     "hasDisplaySpeechOutput" : "display "+speechOutput,
         //     "hasDisplayRepromptText" : randomFact,
         //     "simpleCardTitle" : this.t('SKILL_NAME'),
         //     "simpleCardContent" : randomFact,
         //     "bodyTemplateTitle" : this.t('GET_FACT_MESSAGE'),
         //     "bodyTemplateContent" : randomFact,
         //     "templateToken" : "factBodyTemplate",
         //     "sessionAttributes": {}
         //  };

          var response = {
            "version": "1.0",
            "response": {
              "directives": [
                {
                  "type": "Display.RenderTemplate",
                  "template": {
                    "type": "BodyTemplate2",
                    "token": content.templateToken,
                    "backgroundImage":{
                        "contentDescription": "Birthday Background",
                        "sources": [
                            {
                                "url":"https://wallpapercave.com/wp/bYj5duH.jpg"
                            }
                        ]
                    },
                    "title": content.bodyTemplateTitle,
                    "image": {
                       "contentDescription":"Jules",
                       "sources": [
                           {
                               "url": "https://s3.amazonaws.com/birthday-skill/jbday.jpg"
                           }
                       ]
                    },
                    "textContent": {
                      "primaryText": {
                        "type": "RichText",
                        "text": "<font size = '5'>"+content.bodyTemplateContent+"</font>"
                      }
                    },
                    "backButton": "HIDDEN"
                  }
                }
              ],
              "outputSpeech": {
                "type": "SSML",
                "ssml": "<speak>"+content.hasDisplaySpeechOutput+"</speak>"
              },
              "reprompt": {
                "outputSpeech": {
                  "type": "SSML",
                  "ssml": "<speak>"+content.hasDisplayRepromptText+"</speak>"
                }
              },
              "shouldEndSession": content.askOrTell==":tell",
              "card": {
                "type": "Simple",
                "title": content.simpleCardTitle,
                "content": content.simpleCardContent
              }
            },
            "sessionAttributes": content.sessionAttributes
          }
          this.context.succeed(response);
          break;

      default:
         this.response.speak("Thanks for chatting, goodbye");
         this.emit(':responseReady');
  }

}*/
