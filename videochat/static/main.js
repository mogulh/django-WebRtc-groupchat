 "use strict";
 const roomName = JSON.parse(document.getElementById('room-name').textContent);

        const chatSocket = new WebSocket(
            'ws://'
            + window.location.host
            + '/ws/chat/'
            + roomName
            + '/'
        );


const userID = JSON.parse(document.getElementById('userId').textContent);


        chatSocket.onopen = function(){
        	joinRoom();
        };



        chatSocket.onclose = function(e) {

            console.error('Chat socket closed unexpectedly');
        };




const constraints = {
    'video': true,
    'audio': true
}
navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {

        const myVid = document.getElementById('myVid')
        myVid.msHorizontalMirror = true;
        myVid.controls = false
        myVid.autoplay = true
        myVid.muted = true
        addVideo(myVid, stream)
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

function getConnectedDevices(type, callback) {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const filtered = devices.filter(device => device.kind === type);
            callback(filtered);
        });
}

const userStreams = []

getConnectedDevices('videoinput', cameras => console.log('Cameras found', cameras));
const videoGrid = document.getElementById('grid');


async function shareScreen(){
    console.log("streams", userStreams)
    var stream = await navigator.mediaDevices.getDisplayMedia({'video': true})
    replaceVid('myVid', stream)
    replaceTracksForPeer(localPc, stream)
    stream.onended = async function (){


    }
    stream.onremovetrack = function(){
    console.log("track removed")
    }

    stream.oninactive = async function(){
    console.log("inactive")

        var stream = await navigator.mediaDevices.getUserMedia({'video': true, 'audio':true})
        replaceVid('myVid', stream)
        replaceTracksForPeer(localPc, stream)
    }
   console.log(stream)
}

function replaceVid(id, stream){
    var vid = document.getElementById(id)
    vid.pause()
    vid.srcObject = null
    addVideo(vid, stream)
}

function replaceTracksForPeer(peer, newStream) {
    peer.getSenders().map(function(sender) {
        sender.replaceTrack(newStream.getTracks().find(function(track) {
            return track.kind === sender.track.kind;
        }));
    });
  }





async function createpc(){
    const constraints = {'video': true, 'audio': false};
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = handleIceCandidate

    stream.getTracks().forEach(track => {
    console.log("track", track.kind)
    peerConnection.addTrack(track, stream)


    });

    const remoteStream = new MediaStream();
    peerConnection.ontrack =function (event){
        console.log("new track added")
         remoteStream.addTrack(event.track, remoteStream);
         const peervid = document.createElement('video')
        peervid.controls = true
        peervid.autoplay = true


        addVideo(peervid, remoteStream)

        console.log("track added")

    }
    peerConnection.onremovestream = function (){
        console.log("stream removed")
    }


    return peerConnection
}

var localPc = null;

function joinRoom(){
     sendMessage({
      type: 'join',
    }, userID);
}

async function makeCall() {
    var remotePc = await createpc();
    const offer = await remotePc.createOffer();
    await remotePc.setLocalDescription(offer);

    sendMessage(offer, userID)

}

function sendMessage(message, recipient) {
  console.log('Client sending message: ', message);
  chatSocket.send(JSON.stringify({
    'message': message,
    'sender': userID,
    'recipient': recipient

  }));
  // socket.emit('message', message);
}


const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}

/*
chatSocket.onmessage = async function(e){
       var data = JSON.parse(e.data);
        var raw = JSON.parse(data.message);
        var sender = raw.sender
        var message = raw.message
        console.log('Client message:', message);
        console.log("message senser:" ,sender )

       };*/

chatSocket.onmessage = async function(e){
      var data = JSON.parse(e.data);
        var raw = JSON.parse(data.message);
        var sender = raw.sender
        var message = raw.message
        var rec = raw.recipient
        console.log('Client message:', message);
        console.log("message senser:" ,sender )


        if(message.type ==="offer"){
            if(rec == userID){
                localPc = await createpc();
                localPc.setRemoteDescription(new RTCSessionDescription(message));
                console.log("offer message")
                const answer = await localPc.createAnswer();
                await localPc.setLocalDescription(answer);
                sendMessage(answer, sender);
            }

        }
        else if(message.type ==="join"){
            if(sender != userID){
                makeCall();
            }

        }

     else if (message.type === "answer") {
        if(rec == userID){

            const remoteDesc = new RTCSessionDescription(message);
            await localPc.setRemoteDescription(remoteDesc);
            console.log("pc :", localPc)
            }

        }
    else if (message.type === "candidate") {
        if(userID != rec){
        console.log("candidate message")
        var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
            candidate: message.candidate
             });
         localPc.addIceCandidate(candidate);
         }

    }
 }


function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
   if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }, userID);
  } else {
    console.log('End of candidates.');
  }

}

function addVideo(video, stream){
    video.srcObject = stream;
    videoGrid.append(video)


}

function getPeer(){
console.log(peerConnection)
}

