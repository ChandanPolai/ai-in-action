


dekho mera ek client he jisse ai calling agent chaiye to hamne he naa unka account banya 
videosdk me ok https://app.videosdk.live/recordings?page=1&perPage=20

ab mere owner ne kaha he ki unhne he naa video sdk ka dashboard nahi dena he kyu ki wo waha per priceing dekh lenge .

ham, react ka ek page banayege dashboard calling histru session recrings sari chije ham banayenge videosdk ke 
api ka use karke ok ... and customer prcing ham ui me show karnege ok ....
so simple ai-calling-frontend ke andar fronted banao mere pass he naa unka pura post men collection he ki kesekya karsakte he ok


abhi sirf calling list ka data proepr table format m,e show karna he ok simpel jais ehi project run akru m,ughe dhik jaye niche he token user ka mere user ka ok ...



ai-action-fronted dekhithume ui ka idea code sture ka idea ajyega ok ....

{{BASE_URL}}/sip/call?roomId=room_123456&sessionId=sess_123456&id=call_123456789&gatewayId=gw_123456789&ruleId=rule_123456&type=outbound&search=+1415&startDate=1755820800000&endDate=1755907199999&page=1&perPage=10


import fetch from 'node-fetch';
const options = {
	method: "GET",
	headers: {
		"Authorization": "$YOUR_TOKEN",
	},
};
const url= `https://api.videosdk.live/v2/sip/call?roomId=room_123456&sessionId=sess_123456&id=call_123456789&gatewayId=gw_123456789&ruleId=rule_123456&type=outbound&search=+1415&startDate=1755820800000&endDate=1755907199999&page=1&perPage=10`;
const response = await fetch(url, options);
const data = await response.json();
console.log(data);


{
  "statusCode": 200,
  "pageInfo": {
    "currentPage": 1,
    "perPage": 10,
    "lastPage": 5,
    "total": 45
  },
  "data": [
    {
      "_id": "64f89a7c1a23b4",
      "callId": "call_123456789",
      "type": "outbound",
      "gatewayId": "gw_123456789",
      "gatewayName": "US Gateway",
      "ruleId": "rule_123456",
      "ruleName": "Default Routing Rule",
      "roomId": "room_123456",
      "to": "+14155550123",
      "from": "+14155559876",
      "status": "COMPLETED",
      "timelog": [
        {
          "status": "INITIATED",
          "timestamp": "2025-08-21T11:45:00.000Z"
        },
        {
          "status": "COMPLETED",
          "timestamp": "2025-08-21T11:48:00.000Z"
        }
      ],
      "start": "2025-08-21T11:45:00.000Z",
      "end": "2025-08-21T11:48:00.000Z",
      "sessionId": "sess_123456",
      "userId": "usr_123456",
      "deleted": false
    }
  ]
}





token :
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI1YTBhYjYwMS05NWVlLTRmZTMtYmQ5Yi01MDM0ZTczYmE4NGEiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc4NjQzODU5NSwiZXhwIjoxNzg3MDQzMzk1fQ.OLyuhLIgBY20maaVcGgNUfGwZw7BAn-XWf5PLcP6FfI




-----

mongodb+srv://chandan:G90fm7AzH42ZClsN@cluster0.uyhpfob.mongodb.net/ai-in-action?retryWrites=true&w=majority



*  Billing / GST Invoice Module -

*  Bonus Module - admin panel per henaa ek option abnado bonous karke ok jsime admin kuch cerate akrega ttile dection  rs dena he to iameg kuch bhi fileabrtesdena h to createakrke rkagea mutple userskoassgin akrega jsisie usse uske panel perdhikega simple saabhikeliye itnakardo ok please 

*  Certificate Module -  
ek section banao smamjagayenaa ab hena amdin cretadfcte genatre karke sve kare har srs ka and usko bhepayesmmajagenaa simple .
https://warm-vans-switch.loca.lt/Endpoint: POST /api/v1/generate
Headers: Content-Type: application/json
 Input Request (JSON):
json
{
  "recipient_name": "Rahul Sharma",
  "recipient_email": "rahul@example.com",
  "course_title": "AI IN ACTION",
  "issue_date": "2026-09-08",
  "template_id": "ai_in_action",
  "signatory1_name": "Gouri Shankar",
  "signatory2_name": "Arpit Shah"
}Output Response (JSON):
json
{
  "status": "success",
  "cert_id": "CERT-2026-A1B2C3D4",
  "recipient_name": "Rahul Sharma",
  "course_title": "AI IN ACTION",
  "issue_date": "2026-09-08",
  "verify_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "pdf_url": "/download/CERT-2026-A1B2C3D4.pdf",
  "svg_url": "/download/CERT-2026-A1B2C3D4.svg",
  "full_pdf_url": "http://localhost:8000/download/CERT-2026-A1B2C3D4.pdf"
}Endpoint: POST /api/v1/generate
Headers: Content-Type: application/json
Input Request (JSON):
json
{
  "recipient_name": "Rahul Sharma",
  "recipient_email": "rahul@example.com",
  "course_title": "AI IN ACTION",
  "issue_date": "2026-09-08",
  "template_id": "ai_in_action",
  "signatory1_name": "Gouri Shankar",
  "signatory2_name": "Arpit Shah"
}:outbox_tray: Output Response (JSON):
json
{
  "status": "success",
  "cert_id": "CERT-2026-A1B2C3D4",
  "recipient_name": "Rahul Sharma",
  "course_title": "AI IN ACTION",
  "issue_date": "2026-09-08",
  "verify_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "pdf_url": "/download/CERT-2026-A1B2C3D4.pdf",
  "svg_url": "/download/CERT-2026-A1B2C3D4.svg",
  "full_pdf_url": "http://localhost:8000/download/CERT-2026-A1B2C3D4.pdf"
}Mihir  [12:25 PM]
Batch Certificate Public Generation API
Endpoint: POST /api/v1/batch_generate (Alias: POST /api/certificates/generate_to_folder)
Headers: Content-Type: application/json
Input Request (JSON):
json
{
  "template_id": "ai_in_action",
  "items": [
    {
      "recipient_name": "Sneha Patel",
      "recipient_email": "sneha@example.com",
      "course_title": "AI IN ACTION"
    },
    {
      "recipient_name": "Ananya Roy",
      "recipient_email": "ananya@example.com",
      "course_title": "AI IN ACTION"
    }
  ]
}Output Response (JSON):
json
{
  "status": "success",
  "count": 2,
  "certificates": [
    {
      "cert_id": "CERT-2026-B1C2",
      "recipient_name": "Sneha Patel",
      "pdf_url": "/download/CERT-2026-B1C2.pdf"
    },
    {
      "cert_id": "CERT-2026-D3E4",
      "recipient_name": "Ananya Roy",
      "pdf_url": "/download/CERT-2026-D3E4.pdf"
    }
  ]
}[12:25 PM]https://certs-auto-app.loca.lt
Mihir  [3:01 PM]
https://warm-vans-switch.loca.lt/




*  Video Playback Rules [todo]

Each participant can use the Play action a maximum of 3 times for each video.

If a participant stops a video before it is completed, they should be able to resume from the point where they stopped.

Stopping or pausing a video should not consume a play attempt.

The Play Used count should be updated only when the video is successfully completed.

Once the video is completed, the play count should be updated accordingly.

After the participant reaches the maximum allowed play count, no additional plays should be allowed.
