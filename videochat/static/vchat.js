localStream = null;
peers = {}
videoGrid = document.getElementById('grid')

navigator.mediaDevices.getUserMedia({'video': true, 'audio': false})
    .then(stream=>{
        localStream = stream
        myVid = document.getElementById('myVid')
        video = document.createElement('video')
        video.autoplay = true
        video.muted = true
        addVideo(video, localStream)
    })

const roomName = JSON.parse(document.getElementById('room-name').textContent);
const userID = JSON.parse(document.getElementById('userId').textContent);

const chatSocket = new WebSocket(
    'ws://'
    + window.location.host
    + '/ws/chat/'
    + roomName
    + '/'
);

chatSocket.onopen = function(){
    sendMessage(
        {'type': 'join'},userID
    )
}


function sendMessage(message, recipient) {
    chatSocket.send(JSON.stringify({
      'message': message,
      'sender': userID,
      'recipient': recipient
  
    }));
    // socket.emit('message', message);
  }

async function createpc(sender){
    const constraints = {'video': true, 'audio': false};
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
    const peerConnection = new RTCPeerConnection(configuration);
   // peerConnection.onicecandidate = handleIceCandidate(event, sender)
    stream.getTracks().forEach(track => {
    console.log("track", track.kind)
    peerConnection.addTrack(track, stream)
    });

    peerConnection.onicecandidate = function(event){
         console.log('icecandidate event: ', event);
     if (event.candidate) {
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      }, sender)
    } else {
      console.log('End of candidates.');
    }

    }

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

function addVideo(video, stream){
    video.srcObject = stream
    videoGrid.append(video)
    console.log("src", video.srcObject)
}

chatSocket.onmessage = async function(e){
    var data = JSON.parse(e.data);
    var raw = JSON.parse(data.message);
    var sender = raw.sender
    var message = raw.message
    var rec = raw.recipient
    console.log('Client message:', message);
    console.log("message sender:" ,sender )

    if(message.type ==="join"){
        if(sender != userID){
           // makeCall(sender);
          sendMessage( {'type': 'in'},sender)
        }

    }

    else if (message.type === 'in'){
        if(rec == userID){
            makeCall(sender)
        }
    }


    else if(message.type ==="offer"){
        if(rec == userID){
            console.log("offer from user:", sender)
            pc = await createpc(sender);
            peers[sender] = pc
            peers[sender].setRemoteDescription(new RTCSessionDescription(message));
            const answer = await peers[sender].createAnswer();
            await peers[sender].setLocalDescription(answer);
            sendMessage(answer, sender);
        }

    }
    

    else if (message.type === "answer") {
        if(rec == userID){

            remoteDesc = new RTCSessionDescription(message);
            await peers[sender].setRemoteDescription(remoteDesc);
            console.log("answer from user:", peers[sender])
            }

        }
    else if (message.type === "candidate") {
        console.log("candidate message from: ", sender)
        if(userID == rec){
        console.log("candidate message")
        var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
            });
        peers[sender].addIceCandidate(candidate);
        console.log("peer", peers[sender])
        }

    }
}

async function makeCall(sender){
    pc = await createpc(sender)
    peers[sender] = pc
    const offer = await peers[sender].createOffer();
    await peers[sender].setLocalDescription(offer);
    console.log("created", peers[sender])

    sendMessage(offer, sender)


}

function handleIceCandidate(event, sender) {
    console.log('icecandidate event: ', event);
     if (event.candidate) {
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      }, sender)
    } else {
      console.log('End of candidates.');
    }
  
  }




