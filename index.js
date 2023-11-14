require('dotenv').config();
var express = require('express');
var mysql = require('mysql');
var app = express();
var cors = require('cors')
var session = require('express-session');
const { query, json } = require('express');
var MySQLStore = require('express-mysql-session')(session);

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

function msgParser(error =  false, message = "undefined", sid = "") {
    return JSON.parse(JSON.stringify({ error: error, message: message, sid: sid}));

}




const userData = {
    userName: "usr",
    pwd: "pwd" 
};

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "carti",
    database: "db_vin"
});
con.connect(function(err) {
    if (err) {
      console.error('[MYSQL] error connecting: ' + err.stack);
      return;
    }
  
    console.log('[MYSQL] connected as id ' + con.threadId);
  });


con.on('error', function(err) {
    console.log(err.code); // 'ER_BAD_DB_ERROR'
  });
var options = {
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: 'carti',
	database: 'db_vin',

    schema: {
        tableName: "sessions",
        columnNames: {
            session_id: "sid",
            
        }
    }
};
var sessionStore = new MySQLStore(options, connection= con);

//* fonction pour avoir le nom d'utilisateur grace au sid

function getToken(sid, callback) {
    con.query("SELECT * FROM `users` WHERE `sid` = ?", [sid], function(error, results) {
        try {
            callback(results[0]['token']);
        } catch(err) {
            callback(false);
        }
    });
}

//*fonction qui check si le sid est correct 
function checkSid(sid, callback) {
    con.query('SELECT * FROM `users` WHERE `sid` = ?', [
        sid
    ], function(error, results) {
        console.log(`sid : ${sid}`);
        
        try {
    
            console.log(`[INFOS] function checkSid(): Found, returning 1... \n   Query result: ${results[0]["username"]}`);
            callback(true);

            

        } catch(err) {

            console.log("[ERROR] function checkSid(): sid not found, returning 0.");
            
            
            callback(false) ;
        } 
       
        

    });

}








app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge : 1000 * 60 * 60 * 24 * 7,
        secure : false,
    },
    store: sessionStore
}));

app.use(cors());

app.use(express.json());
app.get('/', function(req, res) {
    console.log(req.session.id)
    res.send("hello world");
    
});

app.get('/api/getSid', function(req,res) {
    console.log(`get sid: ${req.session.id}`);
    res.send(msgParser(error = false, message = "", sid = req.session.id));
});
// **REGISTER SECTION**-----------------------------------------------
app.post('/api/register', function(req, res) {
    let sid = req.session.id
    let token = makeid(20);
    let regInfos = req.body;
    let regUsr = regInfos['usrName'];
    let regPwd1 = regInfos['pwd1'];
    let regPwd2 = regInfos['pwd2'];
    let regMail = regInfos['email'];
    if(regPwd1 != regPwd2 ) {
        res.send(msgParser(error=true, message="Error: Passwords Don't Match", sid = ""));
    }

    console.log(`usrname: ${regUsr}; pwd1: ${regPwd1}; pwd2: ${regPwd2}; email: ${regMail}`);
    con.query('INSERT INTO `users` (username, password, email, token) VALUES (?,?,?,?)', [
        regUsr,
        regPwd,
        regMail,
        token
    ], function(error, results) {
        res.send(msgParser(error=false, message= {redirection: true}, sid = sid));
        
    });
    
    
    
    
});

app.post('/api/getInfos', function(req, res) {
    console.log("Getinfos");
    console.log(req.body);
    //! LE SID VIENT DU COOKIE, PAS DE LA PAGE 
    let sid = req.body.sid;

    con.query('SELECT * FROM `users` WHERE `sid` = ?', [
        sid
    ], function(error, results) {
        
        try {
    
            console.log(`result: ${results}`)
            res.send(msgParser(error = false, message = {"username" : results[0]['username']}, sid = results[0]['sid'] ));
            

        } catch(err) {
            res.send(msgParser(error= true, message= `getinfos: no users found w/ the sid ${sid}`));
        }
        
        

    });

            
            
       
    // checkSid(sid, function(resultat) {
    //     if(resultat === true) {
    //         res.send(msgParser(error = false, message = {"username" : results[0]['username']}, sid = results[0]['sid'] ));
    //     } else {
    //         res.send(msgParser(error= true, message= `getinfos: no users found w/ the sid ${sid}`));
            
    //     }
    // });

    

    // }
    
});


// **LOGIN SECTION**-----------------------------------------------
app.post('/api/login', function(req, res) {
    let done = false;
    let regInfos = req.body;
    let regUsr = regInfos['usrName'];
    let regPwd = regInfos['pwd'];
    let sqlUsr, sqlPwd, sqlToken;
    let sid = req.session.id;



    con.query('SELECT * FROM `users` WHERE `username` = ? AND `password` = ?;', [
        regUsr,
        regPwd
    ],async function (error, results, fields) {
        

        try {
            if(results[0]['username'] != regUsr || results[0]['password'] != regPwd) {
    
                res.send(msgParser(error = true, message = "wrong credentials", sid = sid));
    
                
            }
            console.log(`logged in, usrname: ${results[0].username}; password: ${results[0].username}; token: ${results[0].token};`)
            sqlUsr = results[0]['username'];
            sqlPwd = results[0]['password'];
            sqlToken = results[0]['token'];
    
     
            console.log(results[0]['token']);
    
    
            con.query('UPDATE `users` SET `sid` = ? WHERE `token` = ?', [
                sid,
                results[0]['token']
                
            ],async function (error, results, fields) {
                try {
                    console.log(`updating... `);
                    console.log(`${results['message']}`)
                    res.send(msgParser(error = false, message = "logged", sid = sid));

                } catch(err1) {
                    res.send(msgParser(error = true, message = "Internal Error (update)", sid = sid));
                }
                
            });

        } catch (err) {
            res.send(msgParser(error = true, message = "wrong credentials", sid = sid));

        }
        

        
        
        
        
        
    });



    // console.log(`usrname: ${regUsr}; pwd: ${regPwd};`);




});


app.post('/api/getCaves', function(req, res) {
    console.log("Get caves");
    let sid = req.body.sid;
    checkSid(sid, function(isConnected) {
        if(!isConnected) {
            res.send(msgParser(error = true, message = "Error: you are not connected"));
        } else {

            getToken(sid, function(token) {
    
                
                con.query("SELECT * FROM `caves` WHERE `owner_token` = ?", [token], function(error, results) {
                    try {
                        let cave_id = results[0]['cave_id'];
                        con.query("SELECT * FROM `bottles` WHERE `cave_id` = ?", [cave_id], function(errBtl, resBtl) {
                            try {
                                let c = resBtl;
                                let content = [];
                                for(const element of resBtl) {
                                    content.push(element);
                                }
                                content = JSON.stringify(content);
                                
                                console.log(`Cave content: ${content}`);
                                res.send(msgParser(error=false,`{"name": "${results[0]['name']}", "content": ${content}}`, sid));
                            } catch(errBtl) {
                                console.log("[MYSQL] Error: no btl found");
                            }
                        });
                        // let content = results[0]['content'];
                        
                        
                    } catch(error) {
                        console.log("[MYSQL] Error: no cave found");
                        console.log(error);
                    }
                });
            });
        }
    
        
    });
});

app.post('/api/getBottle', function(req, res) {
    console.log("Get Bottle");
    let sid = req.body.sid;
    let bId = req.body.bId;
    checkSid(sid, function(isConnected) {
        if(!isConnected) {
            res.send(msgParser(error = true, message = "Error: you are not connected"));
        }
        else {

            getToken(sid, function(token) {
    
                con.query("SELECT * FROM `bottles` WHERE `btl_id` = ?", [bId], function(error, results) {
                    try {
                        let content = results[0];
                        content = JSON.stringify(content);
    
                        res.send(msgParser(error=false, message=content, sid));
                    } catch(error) {
                        console.log("Error Bottle id");
                        res.send(msgParser(error=true, message="Error: false bottle Id", sid));
    
                    }
                });
    
    
    
    
                // con.query("SELECT * FROM `caves` WHERE `owner_token` = ?", [token], function(error, results) {
                //     try {
                //         let content = results[0]['content'];
                //         content = JSON.parse(content);
                //         let bInfos = content[bId];
                //         console.log(`bottle infos : ${bInfos}`);
                //         bInfos = JSON.stringify(bInfos);
                //         res.send(msgParser(error=false,message=bInfos, sid));
                //     } catch(error) {
                //         console.log("Error: false bottle Id");
                //         res.send(msgParser(error=true, message="Error: false bottle Id", sid));
                //     }
                // });
            });

        }
    });

});




app.post('/api/getAccInfos', function(req, res) {
    let sid = req.body.sid;
    checkSid(sid, function(isConnected) {
        if(!isConnected) {
            res.send(msgParser(error = true, message = "Error: you are not connected"));
        }
        console.log(`Connected: ===================================== ${isConnected}`);
        if(isConnected) {

            getToken(sid, function(token){
                con.query("SELECT * FROM `users` WHERE `token` = ?", [token], function(error, results){
                    con.query("SELECT * FROM `caves` WHERE `owner_token` = ?", [token], function(errorC, resultsC){
                        try{
                            let caveContent = resultsC[0]['content'];
                            caveContent = JSON.parse(caveContent);
                            
                            let string = JSON.parse(JSON.stringify({username : results[0]['username'], 
                            email : results[0]['email'], bottles : caveContent.length }));
                            res.send(msgParser(error = false, message = string, sid));
                        } catch(err) {
                            console.log(err);
                            res.send(msgParser(error = true, message= "Error: MySQL Query Failed"));
                        }
                        
                    });
                    
                });
            });
        }
        
    })
});

app.post('/api/addItem', function(req, res) {
    let sid = req.body.sid;
    checkSid(sid, function(isConnected) {
        if(!isConnected) {
            res.send(msgParser(error = true, message = "Error: you are not connected"));
            
        } else {



            getToken(sid, function(token) {

                con.query("SELECT * FROM `caves` WHERE `owner_token` = ?", [token], function(error, results) {
                    try{
                        let cave_id = results[0]["cave_id"];
                        let btl_id = makeid(10);
                        let object = req.body;
                        let appelation = object.appelation;
                        let date = parseInt(object.date);
                        let bio = object.bio;
                        let offreur = object.offreur;
                        let type = object.type;
                        let color = object.color;
                        let sweetness = object.sweetness;
                        if(bio == 0) {
                            bio = false
                        } else {
                            bio = true
                        }
                        console.log(`btlid: ${btl_id}, app: ${appelation}, date: ${date}, bio: ${bio}, color: ${color}, sweetness: ${sweetness}`);
                        con.query("INSERT INTO `bottles`(`btl_id`, `cave_id`, `appelation`, `date`, `bio`, `offreur`, `type`, `color`, `sweetness`) VALUES (?,?,?,?,?,?,?,?,?)",
                        [btl_id, cave_id, appelation, date, bio, offreur, type, color, sweetness],
                        function(errorBtl, resultsBtl) {
                            try {
                                console.log(resultsBtl);
                                console.log(errorBtl);
                                res.send(msgParser(error=false, message=`Bottle Added !`));
                            } catch(errorBtl) {
                                console.log("error:");
                                console.log(errorBtl);

                                res.send(msgParser(error=true, message="Internal error"));
                            }
                        }
                        );

                        
                        
                    } catch(error) {
                        console.log(error);
                    };
                });






                // con.query("SELECT * FROM `caves` WHERE `owner_token` = ?", [token], function(error, results) {
                //     try{
                //         let content = results[0]['content'];
                //         let reqInfos = req.body;
                //         // json to array
                //         content = JSON.parse(content);
                //         content.push({appelation: reqInfos['appelation'], date: reqInfos['date'], bio: reqInfos['bio'], offreur: reqInfos['offreur'], type: reqInfos['type'],color: reqInfos['color'],sweetness: reqInfos['sweetness']});
                //         content = JSON.stringify(content);
                //         con.query("UPDATE `caves` SET `content` = ? WHERE `token` = ?", [content, token], function(error1, results1) {
                //             try {
                //                 console.log(results1['message']);
                //                 res.sendStatus(200);
                //             } catch(err) {
    
                //                 console.log("Error : cannot update table  cave...");
                //                 res.send(msgParser(error = true, message = "Error : cannot update table ...", sid));
                //             }
                //         });
                    
                //     } catch(err) {
                //         console.log("[MYSQL] Error: no cave found");
                        
                //         res.send(msgParser(error = true, message = "Error: you are not connected", sid=sid));
    
                //     }
                // });
            });

        }

    });
});



// app.post('/api/search', function(req, res) {
//     let sid = req.body.sid;
//     checkSid(sid, function(isConnected) {
//         if(!isConnected) {
//             res.send(msgParser(error = true, message = "Error: you are not connected"));
            
//         } else {
//             getToken(sid, function(token) {
//                 con.query("SELECT * FROM `caves` WHERE `owner_token` = ?", [token], function(error, results) {
//                     try {
//                         let cave_id = results[0]['cave_id'];
//                         con.query("SELECT * FROM `bottles` WHERE `cave_id` = ?", [cave_id], function(errBtl, resBtl) {
//                             try {
//                                 let c = resBtl;
//                                 let content = [];
//                                 for(const element of resBtl) {
//                                     content.push(element);
//                                 }
//                                 content = JSON.stringify(content);
                                
//                                 console.log(`Cave content: ${content}`);
//                                 res.send(msgParser(error=false,`{"name": "${results[0]['name']}", "content": ${content}}`, sid));
//                             } catch(errBtl) {
//                                 console.log("[MYSQL] Error: no btl found");
//                             }
//                         });
//                         // let content = results[0]['content'];
                        
                        
//                     } catch(error) {
//                         console.log("[MYSQL] Error: no cave found");
//                         console.log(error);
//                     }
//                 });
//             });
//         }
//     });
// });



app.post("/api/editBtl", function(req, res) {
    let sid = req.body.sid;
    let bid = req.body.bId;
    console.log(`BID================= ${bid}`);
    checkSid(sid, function(isConnected){
        if(!isConnected) {
            res.send(msgParser(error = true, message = "Error: you are not connected"));
        } else {
            getToken(sid, function(token) {
                let object = req.body;
                let appelation = object.appelation;
                let date = parseInt(object.date);
                let bio = object.bio;
                let offreur = object.offreur;
                let type = object.type;
                let color = object.color;
                let sweetness = object.sweetness;
                let btl_id = object.bId;
                if(bio == 0) {
                    bio = false
                } else {
                    bio = true
                }
                con.query("SELECT * FROM `caves` WHERE `owner_token` = ? ", [token], function(errorT, resultsT){
                    try{
                        let cave_id = resultsT[0]["cave_id"];
                        con.query("UPDATE `bottles` SET `appelation`=?,`date`=?,`bio`=?,`offreur`=?,`type`=?,`color`=?,`sweetness`=? WHERE (`btl_id` = ? && `cave_id` = ?)", 
                [appelation, date, bio, offreur, type, color, sweetness, btl_id, cave_id], function(errorBtl, resusltsBtl) {
                    try {
                        console.log(resusltsBtl);
                        res.send(msgParser(error= false, message="Bottle Edited.", sid=sid));
                    } catch(error){
                        console.log(error);
                        res.send(msgParser(error= true, message="internal error", sid= sid));
                    }
                });
                    } catch(error) {
                        console.log(error);
                        res.send(msgParser(error= true, message="internal error", sid= sid));
                        
                    }
                })
                
            })
        }   

    })
});


app.post("/api/deleteItem", function(req, res) {
    let sid = req.body.sid;

    checkSid(sid, function(isConnected){
        if(!isConnected) {
            res.send(msgParser(error = true, message = "Error: you are not connected"));
        }else {
            getToken(sid, function(token) {
                
                let btl_id = req.body.bId;
                
                con.query("SELECT * FROM `caves` WHERE `owner_token` = ? ", [token], function(errorT, resultsT){
                    try{
                        let cave_id = resultsT[0]["cave_id"];
                        con.query("DELETE FROM `bottles` WHERE (`btl_id` = ? && `cave_id` = ?)", 
                [btl_id, cave_id], function(errorBtl, resusltsBtl) {
                            try {
                                console.log(`RESULT=====================${resusltsBtl}`);
                                res.send(msgParser(error= false, message="Bottle Deleted.", sid=sid));
                            } catch(error){
                                console.log(error);
                                res.send(msgParser(error= true, message="internal error", sid= sid));
                            }
                });
                    } catch(error) {
                        console.log(error);
                        res.send(msgParser(error= true, message="internal error", sid= sid));
                        
                    }
                })
                
            })
        }
    });
});


console.log("[INFO]    Server started");
app.listen(800);

