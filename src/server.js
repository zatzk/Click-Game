const http = require("http");
const app = require("express")();
const guid = require("./guidGenerator");
app.get("/", (req, res) => res.sendFile(__dirname + "/client.html"));

app.listen(3000, () => console.log("Listening on port 3000"));
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(8080, () => console.log("Listening on port 8080"));

//hashmap clients
const clients = {};
var games = {};

const wsServer = new websocketServer({
    "httpServer": httpServer
})
wsServer.on("request", request => { 
    //connect
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"))
    connection.on("close", () => console.log("closed!"))
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data)
        //I have received a message from the client
        //a user want to create a new game
        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "clicks": 100,
                "clients": []
            }

            const payLoad = {
                "method": "create",
                "game" : games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        //a client want to join
        if (result.method === "join") {

            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            if(game.clients.length >= 3) {
                //sorry max players reach
                return;
            }

            const color =  {"0": "Red", "1": "Green", "2": "Blue", "3": "Yellow"}[game.clients.length]
            game.clients.push({
                "clientId": clientId,
                "color": color
            })
            //start the game
            if (game.clients.length === 2) updateGameState();

            const payLoad = {
                "method": "join",
                "game": game
            }
            //loop through all clients and tell them that people has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }
        //a user plays
        if (result.method === "play") {
            const gameId = result.gameId;
            const clickId = result.clickId;
            const color = result.color;
            let state = games[gameId].state;
            if (!state)
                state = {}
            
            state[clickId] = color;
            games[gameId].state = state;
            
        }

    })

    //generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        "connection":  connection
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }
    //send back the client connect
    connection.send(JSON.stringify(payLoad))

})


function updateGameState(){

    //{"gameid", fasdfsf}
    for (const g of Object.keys(games)) {
        const game = games[g]
        const payLoad = {
            "method": "update",
            "game": game
        }

        game.clients.forEach(c=> {
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        })
    }

    setTimeout(updateGameState, 500);
}






