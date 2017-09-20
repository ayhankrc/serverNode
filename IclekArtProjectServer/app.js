var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var mongoose = require('mongoose');
var dbProductInfos=mongoose.createConnection('mongodb://localhost/Products');
var dbBuyBall = mongoose.createConnection('mongodb://localhost/BuyBall');
var dbUserInfos=mongoose.createConnection('mongodb://localhost/UserInfos');
var dbItemInfos=mongoose.createConnection('mongodb://localhost/ItemInfos');
//mongoose.createConnection('localhost:27017');
var dbUsr = dbUserInfos;
dbUsr.on('error', console.error.bind(console, 'connection error:'));
dbUsr.once('open', function() {
    console.log("Mongo connected to UserInfos");
});
var dbItem = dbItemInfos;//mongoose.connection;
dbItem.on('error', console.error.bind(console, 'connection error:'));
dbItem.once('open', function() {
    console.log("Mongo connected to ItemInfos");
});
var dbProduct = dbProductInfos;
dbProduct.on('error',console.error.bind(console,'connection error:'));
dbProduct.once('open', function() {
    console.log("Mongo connected to ProductInfos");
});
var dbBBall = dbBuyBall;
dbBBall.on('error',console.error.bind(console,'connection error:'));
dbBBall.once('open', function() {
    console.log("Mongo connected to BuyBall");
});
var app = express();
var server =require('http').createServer( app);
var io = require('socket.io').listen(server);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('port',process.env.PORT || 3133);
app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;

var item_infos_schema = mongoose.Schema({
    username: String,
    email:String,
    items:String,
    socketid:String,
    status:String

});

var user_infos_schema = mongoose.Schema({
    username: String,
    password:String,
    amicap:String,
    socketid:String,
    status:String,
    address:String,
    ball_type:String

});


var product_info_schema = mongoose.Schema({
    p_type :String,
    owner:String,
    productID:String,
});

var buyball_infos_schema = mongoose.Schema({
   infos:String
});

var user_infos_model = mongoose.model('UserInfos', user_infos_schema);
var user_infos_collection=dbUsr.collection("Infos");
var item_infos_model = mongoose.model('ItemInfos',item_infos_schema);
var item_infos_collection = dbItem.collection('Infos');
var product_infos_model = mongoose.model('Products',product_info_schema);
var wormholes_infos_collection = dbProductInfos.collection("Wormholes");

var buyball_model = mongoose.model('BuyBall',buyball_infos_schema);
var buy_ball_collestion = dbBuyBall.collection("Infos");

io.on("connection",function (socket) {

    console.log(socket.id);


    socket.on("disconnect",function () {
        user_infos_collection.update({"socketid":socket.id},{$set:{"status":"offline","socketid":"null"}},function (err) {
            if(err) console.log("DISCONNECT - UPDATE ERROR :"+err);
            else{
                console.log(socket.id+" -disconnected");
            }
        });
    });

	
	socket.on("makeMeOffline",function(data){
		
		user_infos_collection.update({"username":data.username},{$set:{"status":"offline"}},function(err){
			if(err) console.log("makeMeOffline err :"+err); 
		});
	});

    socket.on("Login",function (data) {
      user_infos_collection.findOne({$and:[{"username":data.username},{"password":data.password}]},function (err,foundOne) {
         if(err) console.log(err);
         else if(foundOne == null){
           socket.emit("WrongInformation");
         }
         else if(foundOne != null){
           if(foundOne.status != "offline"){
             socket.emit("AlreadyOnline");
           }
           else{
               user_infos_collection.update({$and:[{"username":data.username},{"password":data.password}]},
                   {$set:{"status":"online","socketid":socket.id}},function (err) {
                     if(err) console.log(err);
                     else{
                         data.username = foundOne.username;
                         data.firstname = foundOne.firstname;
                         data.lastname = foundOne.lastname;
                         data.email = foundOne.email
                         socket.emit("LoginSuccess",data);

                         item_infos_collection.findOne({"username":data.username},function (err,foundOne) {
                            if(err) console.log("Item Login FindOne Err :"+err);
                            else{
                                if(foundOne==null){
                                    console.log("Item Login FindOne Null :");
                                    item_infos_collection.insert({
                                        username:data.username,
                                        email:data.email,
                                        socketid:socket.id,
                                        status:"online",
                                        items:"null"
                                    },function (err) {
                                        if(err) console.log("Item insert error Login :"+err);
                                        else{
                                            socket.emit("ItemAnswerSignUp",data);
                                        }
                                    });
                                }
                                else{
                                    data.items=foundOne.items;
                                    console.log(foundOne.items);
                                    socket.emit("ItemAnswerLogin",data);
                                }
                            }

                         });
                     }

                   });
           }
         }
      });
    });

    socket.on("SingUp",function (data) {
        user_infos_collection.findOne({username:data.username},function (err,foundOne) {
            if(err) console.log("SIGIN-FINDONE ERROR: "+err);
            else
            {
                if(foundOne==null){
                    console.log("Sign in için ok");
                    user_infos_collection.insert({
                        username:data.username,
                        firstname:data.firstname,
                        lastname:data.lastname,
                        password:data.password,
                        email:data.email,
                        socketid:socket.id,
                        status:"online",
                        views:"",
                        address:""

                    },function (err) {
                        if(err) console.log("SIGN_IN INSERT ERROR: "+err);
                        else{
                            data.answer="Success";
                            socket.emit("SignInAnswer",data);
                        }
                    });

                    item_infos_collection.insert({
                        username:data.username,
                        email:data.email,
                        socketid:socket.id,
                        status:"online",
                        items:"null"
                    },function (err) {
                        if(err) console.log("Item insert error :"+err);
                        else{
                            socket.emit("ItemAnswerSignUp",data);
                        }
                    });

                }
                else{
                    console.log("Sing in için kullanıcı alınmış");
                    data.answer="ERR_usernameTaken"
                    socket.emit("UsernameTaken",data);
                }
            }
        });


    });

    socket.on("SetNewEmail",function (data) {
        user_infos_collection.update({"socketid":socket.id},{$set:{"email":data.email}},function (err) {
            if(err){
                console.log("SetNewEmail ERROR :"+err);
                socket.emit("SetEmailFail");
            }
            else {
                console.log("New Email Address Set :" + data.email);
                socket.emit("SetEmailSucceeded");
            }
        });
    });
    socket.on("SetNewAddress",function (data) {
        user_infos_collection.update({"socketid":socket.id},{$set:{"address":data.address}},function (err) {
            if(err) {
                socket.emit("SetAddressFail");
                console.log("SetNewAddress ERROR :"+err);
            }
            else {
                console.log("New Address Set :" + data.email);
                socket.emit("SetAddressSucceeded");
            }
        });
    });
    socket.on("SetNewPassword",function (data) {
        user_infos_collection.update({"socketid":socket.id},{$set:{"address":data.password}},function (err) {
            if(err) {
                socket.emit("SetPasswordFail");
                console.log("SetNewPassword ERROR :"+err);
            }
            else {
                console.log("New Password Set :" + data.email);
                socket.emit("SetPasswordSucceeded");
            }
        });
    });

    socket.on("GetProductInfo",function (data) {
        var balls= ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
        var infos=Array;
       if(data.productID == "Wormholes"){
           console.log(data.productID);
           for(var i=0;i<balls.length;i++){
               var s = balls[i];
               wormholes_infos_collection.findOne({"p_type":s},function (err,foundOne) {
                   if(err) console.log("GET PRODUCT ID ERROR:"+err);
                   else{
                       if(foundOne!=null){
                           console.log(foundOne.owner+"--"+foundOne.p_type);
                           data.owner= foundOne.owner;
                           data.p_type = foundOne.p_type;
                           socket.emit("AnswerProductInfos",data);
                       }
                   }

           });
           }

       }
    });

    socket.on("LookedAtBall",function (data) {

        var views="";
        user_infos_collection.findOne({"socketid":socket.id},function (err,found) {
           if(err) console.log("LOOK AT FIND ONE ERROR :"+err);
           else{
               if(found == null){
                   console.log("Found one null at Look at find one func");
               }
               else{
                   views=found.views+","+data.ball_type;

                   user_infos_collection.update({"socketid":socket.id},{$set:{"views":views}},function (err) {
                       if(err) console.log("LOOKED AT BALL ERROR :"+err);
                       else{
                           console.log("LOOK AT BALL ADDED SUCC");
                       }
                   });
               }
           }
        });

    });

	socket.on("Logout",function(data){
	    user_infos_collection.update({"socketid":socket.id},{$set:{"status":"offline"}},function(err){
		    if(err) console.log("LOGOUT UPDATE ERROR :"+err);
	    });
	});
	
    /*socket.on("JoinRoom",function (data) {
       room_infos_collection.findOne({$and:[{"roomType":data.roomType},{$or:[{"userOne_socketID":"null","userTwo_socketID":"null"}]}]},function (err,foundRoom) {
          if(err){
              console.log("JOIN ROOM ERROR :"+err);
              data.answer = "error";
          }
          else{
              if(foundRoom.userOne_socketID == "null"){

                  room_infos_collection.update({"room_id":foundRoom._id},{$set:[{"userOne_username":data.username},{"userOne_socketID":socket.id},{"room_capacity":capacity}]},function (err) {
                     if(err) console.log("JOIN ROOM ERROR UPDATE ROOM :"+err);
                     else{
                         if(capacity==1){
                             data.answer="success";
                             data.mySort = "one";
                             data.room_id = foundRoom._id;
                             socket.emit("JoinRoomAlone",data);
                         }
                         else if(capacity==2){
                             data.oppName = foundRoom.userOne_username;
                             data.oppID = foundRoom.userOne_socketID;
                             io.to(foundRoom.userTwo_socketID).emit("OpponentJoinedRoom",data);

                             data.answer="success";
                             data.mySort = "two";
                             data.room_id = foundRoom._id;
                             data.oppName = foundRoom.userTwo_username;
                             data.oppID = foundRoom.userTwo_socketID;
                             socket.emit("JoinRoomWithAnotherUser",data);

                         }
                     }
                  });

              }
              else if(foundRoom.userTwo_socketID == "null"){
                  room_infos_collection.update({"room_id":foundRoom._id},{$set:[{"userOne_username":data.username},{"userOne_socketID":socket.id}]},function (err) {
                      if(err) console.log("JOIN ROOM ERROR UPDATE ROOM :"+err);
                      else{
                          data.answer="success";
                          data.mySort = "two";
                          data.room_id = foundRoom._id;
                          socket.emit("JoinRoomAnswer",data);
                      }
                  });
              }
          }

       });
    });*/
});
server.listen(app.get('port'),function () {
    console.log("Server is online");
});