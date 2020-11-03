const _ = require("lodash");
const uniqid = require("uniqid");
const {io} = require("../server");
const {	getUserInfo} = require("./utils/users");
//const {	placeBet,	addHistory} = require("./utils/game");

let liveRooms = {};
let pendingRooms = {};
let usersToRoom={};
// roomId:{ users:{userid: { name: "sandip", balance: 156456, avtarId: 15 startTime:},startTime: }}};
// {uId:{users:{_id:{name:"sandip",balance:4555,avtarId:15}}}};

io.on("connection", (socket) => {
	console.log("Socketconnected");
	socket.on("join", async(token, roomPrice) => {
	
		const user = await getUserInfo(token);
		if (!pendingRooms[roomPrice]) {
			let roomId = uniqid();
			socket.join(roomId);
			usersToRoom[user._id] = {
				socketId: socket.id,
				roomId,
				roomPrice
			};
			pendingRooms[roomPrice] = {
				roomId,
				price: roomPrice,
				users: {
					[user._id]: addPendingUsers(user)
				}
	  }
	  sendPendingRoomData(roomId);
	
		} else {
			let roomId = pendingRooms[roomPrice].roomId
			usersToRoom[user._id] = {
				socketId: socket.id,
				roomId,
				roomPrice
			};
      socket.join(pendingRooms[roomPrice].roomId);      
      pendingRooms[roomPrice].users[user._id] = addPendingUsers(user);
      sendPendingRoomData(roomId);
			if (Object.keys(pendingRooms[roomPrice].users).length === 4) {
				liveRooms[roomId] = {
					users: _.cloneDeep(pendingRooms[roomPrice].users),
					roomPrice: roomPrice,
				}
				delete pendingRooms[roomPrice];
				startGame(roomId);
			}
		}


	});

	socket.on('leaveRoom',(roomId,userId,roomPrice) => {
		//if user is available in pending room than delete otherwise its stay on live room
		if(userId!=undefined && roomPrice!=undefined && roomId!=undefined){
			if(pendingRooms[roomPrice]){
				if(pendingRooms[roomPrice].users[userId]!=undefined){
					delete pendingRooms[roomPrice].users[userId];
					delete usersToRoom[userId];
					return sendDesconnectUser(roomId, userId);
				}	
				if (liveRooms[roomId]){
					delete liveRooms[roomId].users[userId];
					delete usersToRoom[userId];
					return sendDesconnectUser(roomId, userId);
				}				
			}
			
		}		
	})


	socket.on("disconnect", ()=>{
		let userId ;
		let roomId ;
		let roomPrice;
		for(let user of Object.keys(usersToRoom))
		{ 
			if(socket.id===usersToRoom[user].socketId){
				userId=userId;
				roomId=usersToRoom[user].roomId;
				roomPrice=usersToRoom[user].roomPrice;
				break;
			}
		}
		//if user is available in pending room than delete otherwise its stay on live room
		if(userId!=undefined && roomPrice!=undefined && roomId!=undefined){
			if(pendingRooms[roomPrice]){
				if(pendingRooms[roomPrice].users[userId]!=undefined){
					delete pendingRooms[roomPrice].users[userId];
					delete usersToRoom[userId];
					return sendDesconnectUser(roomId, userId);
				}	
				if (liveRooms[roomId]){
					return sendDesconnectUser(roomId, userId);
				}				
			}			
		}		
	})
});


const startGame = (roomId,roomPrice) => {
	let seatNo=0;
	for (let userId of Object.keys(liveRooms[roomId].users)){
		liveRooms[roomId].users[userId].seatNo=seatNo;
		seatNo++;
	}
	io.in(roomId).emit("res",{data:liveRooms[roomId],en:"startGame",status:1})

}

const addPendingUsers = (user) => {
	return {
		name: user.name,
		profilePic: user.profilePic,
		avtarId: user.avtarId,
	}
}

const sendDesconnectUser=(roomId, userId)=>{
	return io.in(roomId).emit("res",{data:userId,en:"disconnect",status:1})
}
const sendPendingRoomData=(roomId)=>{
	
  return io.in(roomId).emit("res",{data:pendingRooms[roomPrice],en:"join",status:1});
}
