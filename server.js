const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const https = require('https');

const port = 6969;
const server = http.createServer(express);
const wss = new WebSocket.Server({ server })

var page = 1;
var offset = 1000;
var latest_block = 1;

function get_latestTransferLists(ws, address) {
    var request_url = 'https://api.bscscan.com/api?module=account&action=tokentx&contractaddress='+ address +'&startblock=' + latest_block + '&endblock=99999999&sort=desc&apikey=J21VFNWHAS2GZERFXAT4BHJPV5RADG5VTQ';

    console.log(request_url);
    https.get(request_url, (resp) => {
        let transfer_data = '';
        resp.on('data', (chunk) => {
            transfer_data += chunk;
        });
        resp.on('end', () => {
            var data_object = JSON.parse(transfer_data);
            if(data_object.result == "string" || data_object.result == null)
                return;
            else if(data_object.result.length > 0 )
            {
                latest_block = parseInt(data_object.result[0].blockNumber);
                latest_block++;
                ws.send(transfer_data);
            }
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

function start_monitor_latest_block_thread(ws, address) {
    console.log(latest_block++);
    console.log("end");

    const interval = setInterval(function ping() {
        get_latestTransferLists(ws, address);
    }, 20000);
}


function getTransferLists(ws, address)
{
    var request_url = 'https://api.bscscan.com/api?module=account&action=tokentx&contractaddress='+ address +'&startblock=1&endblock=99999999&page=' + page + '&offset=' + offset + '&sort=desc&apikey=J21VFNWHAS2GZERFXAT4BHJPV5RADG5VTQ';
    console.log(request_url);

    https.get(request_url, (resp) => {
        let transfer_data = '';
        resp.on('data', (chunk) => {
            transfer_data += chunk;
        });
        resp.on('end', () => {
            var data_object = JSON.parse(transfer_data);
            if(data_object.result == "string" || data_object.result == null)
            {
                start_monitor_latest_block_thread(ws, address);
                return;
            }
            else if(data_object.result.constructor === Array)
            {
                page++;
                console.log(data_object.result.length);
                
                if(latest_block == 1)
                    latest_block = parseInt(data_object.result[0].blockNumber);
                
                ws.send(transfer_data);
                getTransferLists(ws,address);
            }
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

wss.on('connection', function connection(ws) {    
    ws.on('message', function incoming(data) {
        var address = data;
        getTransferLists(ws, address);

    })
})

server.listen(port, function() {
  console.log(`Server is listening on ${port}!`)
})