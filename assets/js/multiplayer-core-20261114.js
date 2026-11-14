(()=>{
'use strict';
const SUPABASE_URL='https://ksyfhscjfqzenifcttiu.supabase.co';
const SUPABASE_KEY='sb_publishable_eL_Da06cmHz3W58jpcBIBQ_YzTThTL4';
const $=id=>document.getElementById(id);
const status=(el,text,kind='')=>{el.textContent=text||'';el.className='status'+(kind?' '+kind:'')};
let sb=null,user=null,room=null,channel=null,presenceUsers=new Set(),busy=false;
let matchmakingTimer=null,matchmakingBusy=false,matchmakingPrefs=null,matchmakingPollPromise=null;
let gamePollTimer=null,gamePollBusy=false,gameState=null,gameRenderedQuestion=0,rematchPollTimer=null,rematchPollBusy=false,rematchRoomCode=null;
const errorText=e=>e?.message||'処理に失敗しました。';
function setBusy(value){
 busy=value;
 ['createRoom','joinRoom','toggleReady','startMatch','leaveRoom','refreshRoom','copyInvite','findMatch','cancelMatch'].forEach(id=>$(id).disabled=value);
 if(room){
  const mine=room.players?.find(player=>player.user_id===user?.id);
  $('toggleReady').disabled=value||room.status!=='waiting'||!mine;
  $('findMatch').disabled=value||true;
 }
}
async function invoke(name,args){
 const {data,error}=await sb.rpc(name,args);
 if(error)throw error;
 return data;
}
function stopRematchPolling(){if(rematchPollTimer){clearInterval(rematchPollTimer);rematchPollTimer=null}}
async function removeChannel(){
 if(channel){try{await sb.removeChannel(channel)}catch(_){}channel=null}
 presenceUsers=new Set();
}
function renderPresence(){
 if(!room)return;
 const state=channel?.presenceState?.()||{};
 presenceUsers=new Set(Object.values(state).flat().map(x=>x?.user_id).filter(Boolean));
 renderPlayers();
}
function renderPlayers(){
 if(!room)return;
 const list=$('playerList');list.replaceChildren();
 const players=Array.isArray(room.players)?room.players:[];
 $('playerCount').textContent=players.length+' / '+room.max_players+'人';
 for(const p of players){
  const li=document.createElement('li');li.className='player';
  if(p.avatar_path){const img=document.createElement('img');img.className='avatar';img.alt='';img.loading='lazy';img.src=p.avatar_path.startsWith('https://')?p.avatar_path:'';li.append(img)}
  else{const avatar=document.createElement('div');avatar.className='avatar';avatar.setAttribute('aria-hidden','true');li.append(avatar)}
  const meta=document.createElement('div');meta.className='player-meta';
  const name=document.createElement('div');name.className='player-name';name.textContent=p.display_name||p.username||'AQW User';
  const handle=document.createElement('div');handle.className='player-handle';handle.textContent='@'+(p.username||'user');
  meta.append(name,handle);li.append(meta);
  if(p.is_host){const host=document.createElement('span');host.className='pill';host.textContent='ホスト';li.append(host)}
  const ready=document.createElement('span');ready.className='pill'+(p.is_ready?' ready':'');ready.textContent=p.is_ready?'準備完了':'準備中';li.append(ready);
  const online=document.createElement('span');online.className='pill'+(presenceUsers.has(p.user_id)?' online':'');online.textContent=presenceUsers.has(p.user_id)?'オンライン':'接続確認中';li.append(online);
  list.append(li);
 }
 const mine=players.find(p=>p.user_id===user.id);
 $('toggleReady').textContent=mine?.is_ready?'準備を取り消す':'準備完了にする';
 $('toggleReady').disabled=room.status!=='waiting'||busy;
 const allReady=players.length===2&&players.every(p=>p.is_ready);
 const isHost=room.host_id===user.id;
 $('startMatch').classList.toggle('hidden',!isHost||room.status!=='waiting');
 $('startMatch').disabled=busy||!allReady||room.status!=='waiting';
 status($('roomStatus'),room.status==='waiting'?(allReady?'全員の準備が完了しました。ホストは対戦を開始できます。':'参加者全員の準備完了を待っています。'):room.status==='playing'?'対戦ルームは開始状態です。':room.status==='completed'?'対戦は終了しました。':'このルームは終了しました。',allReady?'good':'');
}
async function announce(){
 if(channel)await channel.send({type:'broadcast',event:'room_changed',payload:{changed:true}});
}
async function connectRoom(){
 await removeChannel();
 if(!room)return;
 await sb.realtime.setAuth();
 channel=sb.channel('aqw-match:'+room.id,{config:{private:true,presence:{key:user.id}}})
  .on('broadcast',{event:'room_changed'},async()=>{await refreshRoom(false)})
  .on('presence',{event:'sync'},renderPresence)
  .on('presence',{event:'join'},async()=>{renderPresence();try{await refreshRoom(false)}catch(e){status($('roomActionStatus'),errorText(e),'error')}})
  .on('presence',{event:'leave'},async()=>{renderPresence();try{await refreshRoom(false)}catch(e){status($('roomActionStatus'),errorText(e),'error')}});
 channel.subscribe(async state=>{
  if(state==='SUBSCRIBED'){
   const mine=room.players.find(p=>p.user_id===user.id);
   await channel.track({user_id:user.id,display_name:mine?.display_name||'AQW User'});
   status($('roomActionStatus'),'リアルタイム接続中。','good');
  }else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'){
   status($('roomActionStatus'),'リアルタイム接続に失敗しました。再読み込みしてください。','error');
  }
 });
}
async function refreshRoom(reconnect=true){
 if(!room)return;
 const data=await invoke('aqw_match_get_room',{p_room_code:room.room_code});
 room=data;
 $('roomCodeDisplay').textContent=room.room_code;
 $('roomPanel').classList.remove('hidden');
 $('createPanel').classList.add('hidden');$('joinPanel').classList.add('hidden');$('randomMatchPanel').classList.add('hidden');
 renderPlayers();
 if(reconnect)await connectRoom();
 if(room.status==='playing')startGamePolling();
}
async function enterRoom(data){
 stopRematchPolling();stopGamePolling();gameState=null;gameRenderedQuestion=0;
 $('gamePanel').classList.add('hidden');$('gameResult').classList.add('hidden');$('gameQuestionArea').classList.add('hidden');
 room=data;
 $('roomCodeInput').value=room.room_code;
 await refreshRoom(true);
 if(room.status==='playing')startGamePolling();
 history.replaceState(null,'',location.pathname+'?room='+encodeURIComponent(room.room_code));
 status($('pageStatus'),'ルームに接続しました。','good');
}
function stopMatchmakingPolling(){
 if(matchmakingTimer){clearInterval(matchmakingTimer);matchmakingTimer=null}
}
function showMatchmakingWaiting(data){
 $('matchmakingWait').classList.remove('hidden');
 const count=Number(data.players_waiting)||1;
 status($('matchmakingStatus'),`対戦相手を検索中…（現在 ${count}/${data.required_players}人）`);
}
async function handleMatchmakingResult(data){
 if(data?.status==='searching'){showMatchmakingWaiting(data);return}
 if(data?.status==='matched'||data?.status==='in_room'){
  stopMatchmakingPolling();
  $('matchmakingWait').classList.add('hidden');
  await enterRoom(data.room);
  return;
 }
 throw new Error('マッチング結果を確認できませんでした。');
}
async function pollMatchmaking(){
 if(matchmakingBusy||!matchmakingPrefs||!user||room)return;
 matchmakingBusy=true;
 const task=(async()=>{
  try{
   const data=await invoke('aqw_matchmaking_join',matchmakingPrefs);
   await handleMatchmakingResult(data);
  }catch(e){
   stopMatchmakingPolling();
   status($('matchmakingStatus'),errorText(e),'error');
  }
 })();
 matchmakingPollPromise=task;
 try{await task}
 finally{
  if(matchmakingPollPromise===task)matchmakingPollPromise=null;
  matchmakingBusy=false;
 }
}
async function findRandomMatch(){
 if(busy||room)return;
 matchmakingPrefs={
  p_max_players:Number($('randomMaxPlayers').value),
  p_question_count:Number($('randomQuestionCount').value)
 };
 setBusy(true);
 status($('pageStatus'),'ランダムマッチを検索しています…');
 try{
  const data=await invoke('aqw_matchmaking_join',matchmakingPrefs);
  await handleMatchmakingResult(data);
  if(data?.status==='searching'&&!matchmakingTimer){
   matchmakingTimer=setInterval(pollMatchmaking,4000);
  }
 }catch(e){status($('pageStatus'),errorText(e),'error')}
 finally{setBusy(false)}
}
async function cancelRandomMatch(){
 if(busy)return;
 if(matchmakingBusy){status($('matchmakingStatus'),'検索処理中です。少し待ってからキャンセルしてください。');return}
 stopMatchmakingPolling();
 setBusy(true);
 try{
  if(matchmakingPollPromise)await matchmakingPollPromise;
  if(room){
   $('matchmakingWait').classList.add('hidden');
   return;
  }
  await invoke('aqw_matchmaking_cancel',{});
  matchmakingPrefs=null;
  $('matchmakingWait').classList.add('hidden');
  status($('pageStatus'),'ランダムマッチをキャンセルしました。','good');
 }catch(e){status($('matchmakingStatus'),errorText(e),'error')}
 finally{setBusy(false)}
}
async function createRoom(){
 if(busy)return;setBusy(true);status($('pageStatus'),'ルームを作成しています…');
 try{const data=await invoke('aqw_match_create_room',{p_max_players:Number($('maxPlayers').value),p_question_count:Number($('questionCount').value)});await enterRoom(data)}
 catch(e){status($('pageStatus'),errorText(e),'error')}finally{setBusy(false);if(room)renderPlayers()}
}
async function joinRoom(){
 if(busy)return;const code=$('roomCodeInput').value.trim().toUpperCase();
 if(!/^[0-9A-F]{10}$/.test(code)){status($('pageStatus'),'10桁のルームコードを入力してください。','error');return}
 setBusy(true);status($('pageStatus'),'ルームに参加しています…');
 try{const data=await invoke('aqw_match_join_room',{p_room_code:code});await enterRoom(data)}
 catch(e){status($('pageStatus'),errorText(e),'error')}finally{setBusy(false);if(room)renderPlayers()}
}
async function toggleReady(){
 if(!room||busy)return;const mine=room.players.find(p=>p.user_id===user.id);if(!mine)return;
 setBusy(true);
 try{room=await invoke('aqw_match_set_ready',{p_room_code:room.room_code,p_is_ready:!mine.is_ready});renderPlayers();await announce()}
 catch(e){status($('roomActionStatus'),errorText(e),'error')}finally{setBusy(false);if(room)renderPlayers()}
}
async function startMatch(){
 if(!room||busy||room.host_id!==user.id)return;
 const players=Array.isArray(room.players)?room.players:[];
 if(players.length!==2||!players.every(p=>p.is_ready)){
  status($('roomActionStatus'),'参加者2人全員の準備完了が必要です。','error');return;
 }
 setBusy(true);
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('ログイン状態を確認できません。');
  const response=await fetch(SUPABASE_URL+'/functions/v1/aqw-match-prepare',{
   method:'POST',
   headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+session.access_token},
   body:JSON.stringify({room_code:room.room_code}),
   cache:'no-store'
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||'対戦を開始できませんでした。');
  room=await invoke('aqw_match_get_room',{p_room_code:room.room_code});
  renderPlayers();
  await announce();
  startGamePolling();
  status($('roomActionStatus'),'同期クイズを開始しました。','good');
 }catch(e){
  try{await refreshRoom(false)}catch(_){}
  status($('roomActionStatus'),errorText(e),'error')
 }
 finally{setBusy(false);if(room)renderPlayers()}
}

function stopGamePolling(){
 if(gamePollTimer){clearInterval(gamePollTimer);gamePollTimer=null}
}
function renderGameScores(players=[]){
 const box=$('gameScoreboard');box.replaceChildren();
 for(const p of players){
  const item=document.createElement('div');item.className='game-score';
  const name=document.createElement('div');name.textContent=p.display_name||p.username||'プレイヤー';
  const score=document.createElement('strong');score.textContent=String(Number(p.score)||0);
  const label=document.createElement('div');label.className='muted';label.textContent=p.user_id===user.id?'あなた':'対戦相手';
  item.append(name,score,label);box.append(item);
 }
}
function renderGameState(data){
 gameState=data;
 renderGameScores(data.players||[]);
 $('gamePanel').classList.remove('hidden');
 $('gameProgress').textContent=data.status==='completed'?'終了':(data.current_question+' / '+data.question_count+'問');
 if(data.status==='completed'||data.status==='cancelled'){
  $('surrenderMatch').classList.add('hidden');
  $('gameQuestionArea').classList.add('hidden');$('gameResult').classList.remove('hidden');
  const me=(data.players||[]).find(p=>p.user_id===user.id),opponent=(data.players||[]).find(p=>p.user_id!==user.id),winner=data.winner_id;
  $('gameResultTitle').textContent=data.status==='cancelled'?'対戦が中断されました':winner===null?'引き分け':winner===user.id?'あなたの勝ち':'あなたの負け';
  $('gameResultText').textContent=data.status==='cancelled'?'対戦相手が退出したため、対戦を終了しました。':data.end_reason==='surrender'?(winner===user.id?'相手が降参しました。あなたの勝利です。':'あなたが降参しました。')+' 最終スコア：あなた '+(me?.score||0)+'点 / 相手 '+(opponent?.score||0)+'点':'最終スコア：あなた '+(me?.score||0)+'点 / 相手 '+(opponent?.score||0)+'点';
  status($('gameStatus'),data.status==='cancelled'?'対戦が中断されました。':'対戦が終了しました。','good');
  stopGamePolling();
  if(data.status==='completed'){startRematchPolling();}else{stopRematchPolling();}
  loadMatchHistory();return;
 }
 if(data.status!=='playing'||!data.question){
  $('surrenderMatch').classList.add('hidden');
  status($('gameStatus'),'対戦データを準備しています…');return;
 }
 $('surrenderMatch').classList.remove('hidden');$('surrenderMatch').disabled=false;
 $('gameResult').classList.add('hidden');$('gameQuestionArea').classList.remove('hidden');
 const q=data.question;
 if(gameRenderedQuestion!==q.question_no){
  gameRenderedQuestion=q.question_no;
  $('gamePrompt').textContent=q.prompt;
  $('gameQuestionImage').src=q.image_url;$('gameQuestionImage').alt='出題作品の画像';
  const options=$('gameOptions');options.replaceChildren();
  q.options.forEach((option,index)=>{
   const b=document.createElement('button');b.type='button';b.className='game-option';b.textContent=option;
   b.addEventListener('click',()=>submitGameAnswer(index));options.append(b);
  });
  $('gameFeedback').textContent='';
 }
 const deadline=Date.parse(q.deadline_at);
 const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
 $('gameTimer').textContent=remaining+'秒';
 const buttons=[...$('gameOptions').querySelectorAll('button')];
 const answered=!!data.my_answer;
 buttons.forEach((b,index)=>{
  b.disabled=answered||q.resolved_at!==null||remaining<=0;
  b.classList.toggle('correct',q.resolved_at!==null&&index===q.correct_option_index);
  b.classList.toggle('wrong',q.resolved_at!==null&&data.my_answer?.selected_option_index===index&&!data.my_answer?.is_correct);
 });
 if(q.resolved_at!==null){
  $('gameFeedback').textContent=data.my_answer?(data.my_answer.is_correct?'正解':'不正解')+'。正解：'+q.options[q.correct_option_index]:'時間切れ。正解：'+q.options[q.correct_option_index];
  status($('gameStatus'),'次の問題を準備しています…');
 }else if(answered){
  $('gameFeedback').textContent='回答を受け付けました。対戦相手の回答を待っています。';
  status($('gameStatus'),'相手の回答を待っています。');
 }else if(remaining<=0){
  $('gameFeedback').textContent='回答時間が終了しました。';
  status($('gameStatus'),'回答を締め切りました。');
 }else{
  status($('gameStatus'),'制限時間内に回答してください。');
 }
}
async function requestRematch(){
 if(!room||!gameState||gameState.status!=='completed'||busy)return;
 const button=$('requestRematch');button.disabled=true;
 try{
  const data=await invoke('aqw_match_rematch_request',{p_room_code:room.room_code});
  status($('rematchStatus'),data.status==='pending'?'再戦を申し込みました。相手の承認を待っています。':'再戦申請を確認しました。','good');
  await refreshRematchState();
 }catch(e){status($('rematchStatus'),errorText(e),'error');button.disabled=false}
}
async function respondRematch(requestId,accept){
 try{
  const data=await invoke('aqw_match_rematch_respond',{p_request_id:requestId,p_accept:accept});
  if(data.status==='accepted'&&data.room_code){
   const roomData=await invoke('aqw_match_get_room',{p_room_code:data.room_code});
   await enterRoom(roomData);
   return;
  }
  status($('rematchStatus'),data.status==='declined'?'再戦申請を辞退しました。':'再戦申請の有効期限が切れています。');
  await refreshRematchState();
 }catch(e){status($('rematchStatus'),errorText(e),'error')}
}
async function refreshRematchState(){
 if(!user||rematchPollBusy)return;
 rematchPollBusy=true;
 try{
  const data=await invoke('aqw_match_rematch_state',{});
  const requests=Array.isArray(data?.requests)?data.requests:[];
  $('requestRematch').disabled=requests.some(r=>r.status==='pending'&&(r.requester_id===user.id||r.recipient_id===user.id));
  const inbox=$('rematchInbox');inbox.replaceChildren();
  for(const req of requests){
   if(req.status==='accepted'&&req.new_room_code&&req.requester_id===user.id&&room&&room.room_code===rematchRoomCode){
    const nextRoom=await invoke('aqw_match_get_room',{p_room_code:req.new_room_code});
    await enterRoom(nextRoom);return;
   }
   if(req.status!=='pending')continue;
   const item=document.createElement('div');item.className='note';
   const message=document.createElement('p');
   if(req.recipient_id===user.id){
    message.textContent=(req.requester_name||'対戦相手')+' から再戦の申し込みがあります。';
    const actions=document.createElement('div');actions.className='form-actions';
    const accept=document.createElement('button');accept.type='button';accept.className='primary';accept.textContent='承認して再戦';
    accept.addEventListener('click',()=>respondRematch(req.request_id,true));
    const decline=document.createElement('button');decline.type='button';decline.className='danger';decline.textContent='辞退する';
    decline.addEventListener('click',()=>respondRematch(req.request_id,false));
    actions.append(accept,decline);item.append(message,actions);
   }else{
    message.textContent='再戦申請を送信済みです。相手の承認を待っています。';
    item.append(message);
   }
   inbox.append(item);
  }
  if(!requests.some(r=>r.status==='pending')&&$('requestRematch')&&!$('rematchStatus').textContent)status($('rematchStatus'),'再戦申請があれば、ここに表示されます。');
 }catch(e){status($('rematchStatus'),errorText(e),'error')}
 finally{rematchPollBusy=false}
}
function startRematchPolling(){
 if(!room)return;
 rematchRoomCode=room.room_code;
 $('requestRematch').disabled=false;
 refreshRematchState();
 if(!rematchPollTimer)rematchPollTimer=setInterval(refreshRematchState,4000);
}
async function surrenderGame(){
 if(!room||!gameState||gameState.status!=='playing'||busy)return;
 if(!window.confirm('この対戦を降参して終了しますか？'))return;
 $('surrenderMatch').disabled=true;
 try{
  await invoke('aqw_match_surrender',{p_room_code:room.room_code});
  await refreshGameState();
 }catch(e){
  status($('gameStatus'),errorText(e),'error');
  $('surrenderMatch').disabled=false;
 }
}
async function refreshGameState(){
 if(!room||gamePollBusy)return;
 const roomCode=room.room_code;
 gamePollBusy=true;
 try{
  const data=await invoke('aqw_match_game_state',{p_room_code:roomCode});
  if(!room||room.room_code!==roomCode)return;
  renderGameState(data);
 }catch(e){status($('gameStatus'),errorText(e),'error')}
 finally{gamePollBusy=false}
}
function startGamePolling(){
 if(gamePollTimer)return;
 $('gamePanel').classList.remove('hidden');
 refreshGameState();
 gamePollTimer=setInterval(refreshGameState,900);
}
async function submitGameAnswer(index){
 if(!room||!gameState||gameState.status!=='playing'||gameState.my_answer||gameState.question?.resolved_at!==null)return;
 const buttons=[...$('gameOptions').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 try{
  await invoke('aqw_match_submit_answer',{p_room_code:room.room_code,p_selected_option_index:index});
  await refreshGameState();
 }catch(e){
  status($('gameStatus'),errorText(e),'error');
  await refreshGameState();
 }
}

async function leaveRoom(){
 if(!room||busy)return;stopMatchmakingPolling();stopGamePolling();stopRematchPolling();gameState=null;gameRenderedQuestion=0;matchmakingPrefs=null;setBusy(true);
 try{await invoke('aqw_match_leave_room',{p_room_code:room.room_code});await removeChannel();room=null;$('roomPanel').classList.add('hidden');$('gamePanel').classList.add('hidden');$('createPanel').classList.remove('hidden');$('joinPanel').classList.remove('hidden');$('randomMatchPanel').classList.remove('hidden');history.replaceState(null,'',location.pathname);status($('pageStatus'),'ルームから退出しました。','good')}
 catch(e){status($('roomActionStatus'),errorText(e),'error')}finally{setBusy(false)}
}
async function copyInvite(){
 if(!room)return;
 const url=location.origin+location.pathname+'?room='+encodeURIComponent(room.room_code);
 try{await navigator.clipboard.writeText(url);status($('roomActionStatus'),'招待リンクをコピーしました。','good')}
 catch(_){status($('roomActionStatus'),'コピーできませんでした。ルームコードを共有してください。','error')}
}
async function loadMatchHistory(){
 const list=$('matchHistoryList');
 const stats=$('matchHistoryStats');
 status($('matchHistoryStatus'),'戦績を読み込んでいます…');
 try{
  const data=await invoke('aqw_match_history',{p_limit:20});
  const s=data?.stats||{};
  const values=[
   ['対戦数',Number(s.matches)||0],
   ['勝利',Number(s.wins)||0],
   ['敗北',Number(s.losses)||0],
   ['引き分け',Number(s.draws)||0]
  ];
  stats.replaceChildren();
  values.forEach(([label,value])=>{
   const card=document.createElement('div');card.className='game-score';
   const name=document.createElement('span');name.textContent=label;
   const number=document.createElement('strong');number.textContent=String(value);
   card.append(name,number);stats.append(card);
  });
  list.replaceChildren();
  const matches=Array.isArray(data?.matches)?data.matches:[];
  if(!matches.length){
   status($('matchHistoryStatus'),'完了した対戦はまだありません。');
   return;
  }
  for(const match of matches){
   const item=document.createElement('li');item.className='match-history-item';
   const meta=document.createElement('div');meta.className='match-history-meta';
   const opponent=document.createElement('div');opponent.className='match-history-opponent';
   opponent.textContent='対戦相手：'+(match.opponent_name||'AQW User');
   const detail=document.createElement('div');detail.className='match-history-detail';
   const date=match.finished_at?new Date(match.finished_at).toLocaleString('ja-JP'):'日時不明';
   detail.textContent=date+' ・ '+match.question_count+'問 ・ '+match.my_score+' - '+match.opponent_score;
   meta.append(opponent,detail);
   const result=document.createElement('span');result.className='match-history-result '+match.result;
   result.textContent=match.end_reason==='surrender'?(match.result==='win'?'降参勝利':'降参敗北'):match.result==='win'?'勝利':match.result==='loss'?'敗北':'引き分け';
   item.append(meta,result);list.append(item);
  }
  status($('matchHistoryStatus'),'直近'+matches.length+'件を表示しています。','good');
 }catch(e){
  status($('matchHistoryStatus'),errorText(e),'error');
 }
}

async function loadOneVsOneLeaderboard(){
 const list=$('oneVsOneLeaderboard');list.replaceChildren();
 status($('oneVsOneLeaderboardStatus'),'ランキングを読み込んでいます…');
 try{
  const data=await invoke('aqw_match_one_vs_one_leaderboard',{p_limit:50});
  const entries=Array.isArray(data?.entries)?data.entries:[];
  if(!entries.length){status($('oneVsOneLeaderboardStatus'),'完了した1対1対戦はまだありません。');return}
  for(const entry of entries){
   const item=document.createElement('li');
   const rank=document.createElement('span');rank.className='onevone-rank';rank.textContent=String(entry.rank);
   const meta=document.createElement('div');
   const name=document.createElement('div');name.className='onevone-name';name.textContent=entry.display_name||entry.username||'AQW User';
   const detail=document.createElement('div');detail.className='onevone-meta';
   detail.textContent='@'+(entry.username||'user')+' ・ '+entry.wins+'勝 '+entry.losses+'敗 '+entry.draws+'分 ・ '+entry.matches+'戦';
   meta.append(name,detail);
   const rate=document.createElement('span');rate.className='onevone-rate';rate.textContent='勝率 '+Number(entry.win_rate||0).toFixed(1)+'%';
   item.append(rank,meta,rate);list.append(item);
  }
  status($('oneVsOneLeaderboardStatus'),'上位'+entries.length+'人を表示しています。','good');
 }catch(e){status($('oneVsOneLeaderboardStatus'),errorText(e),'error')}
}
async function init(){
 if(!window.supabase?.createClient){status($('pageStatus'),'認証ライブラリを読み込めませんでした。','error');return}
 sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,storage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:{session},error}=await sb.auth.getSession();
 if(error){status($('pageStatus'),errorText(error),'error');return}
 if(!session?.user){$('authGate').classList.remove('hidden');return}
 user=session.user;$('mainArea').classList.remove('hidden');
 await loadMatchHistory();
 await loadOneVsOneLeaderboard();
 $('createRoom').addEventListener('click',createRoom);
 $('joinRoom').addEventListener('click',joinRoom);
 $('findMatch').addEventListener('click',findRandomMatch);
 $('cancelMatch').addEventListener('click',cancelRandomMatch);
 $('toggleReady').addEventListener('click',toggleReady);
 $('startMatch').addEventListener('click',startMatch);
 $('surrenderMatch').addEventListener('click',surrenderGame);
 $('requestRematch').addEventListener('click',requestRematch);
 $('leaveRoom').addEventListener('click',leaveRoom);
 $('copyInvite').addEventListener('click',copyInvite);
 $('refreshMatchHistory').addEventListener('click',loadMatchHistory);
 $('refreshOneVsOneLeaderboard').addEventListener('click',loadOneVsOneLeaderboard);
 $('refreshRoom').addEventListener('click',()=>refreshRoom(false).catch(e=>status($('roomActionStatus'),errorText(e),'error')));
 $('roomCodeInput').addEventListener('input',()=>{$('roomCodeInput').value=$('roomCodeInput').value.toUpperCase().replace(/[^0-9A-F]/g,'').slice(0,10)});
 const params=new URLSearchParams(location.search),code=params.get('room');
 if(code){$('roomCodeInput').value=code.toUpperCase();await joinRoom()}
 sb.auth.onAuthStateChange((event,nextSession)=>{if(event==='SIGNED_OUT'||!nextSession?.user){removeChannel();stopGamePolling();stopRematchPolling();user=null;room=null;$('mainArea').classList.add('hidden');$('authGate').classList.remove('hidden')}});
}
init().catch(e=>status($('pageStatus'),errorText(e),'error'));
})();
