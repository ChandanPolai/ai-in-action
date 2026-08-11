


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

