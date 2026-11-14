(()=> {
'use strict';
const SUPABASE_URL='https://ksyfhscjfqzenifcttiu.supabase.co';
const KEY='sb_publishable_eL_Da06cmHz3W58jpcBIBQ_YzTThTL4';
const $=id=>document.getElementById(id);
const status=$('status');
const client=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
let activeUser=null;
function clearMfaSecrets(){
 $('mfaQr').removeAttribute('src');
 $('mfaSecret').textContent='';
 $('mfaCode').value='';
 $('mfaSetup').classList.add('hidden');
 pendingMfaFactorId='';
 pendingMfaChallengeId='';
}
client.auth.onAuthStateChange((event,session)=>{
 if(event==='TOKEN_REFRESHED'&&session?.user)activeUser=session.user;
 if(event==='SIGNED_OUT')setTimeout(()=>{
  activeUser=null;
  clearMfaSecrets();
  $('console').classList.add('hidden');
  $('mfaCard').classList.add('hidden');
  $('loginCard').classList.remove('hidden');
  say('セッションが終了しました。再度ログインしてください。');
 },0);
});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function say(message,kind=''){status.textContent=message;status.className='status'+(kind?' '+kind:'')}
function date(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ja-JP')}
async function count(table){const {count,error}=await client.from(table).select('*',{count:'exact',head:true});if(error)throw error;return count??0}
async function countPendingReports(){const {count,error}=await client.from('user_reports').select('id',{count:'exact',head:true}).eq('status','pending');if(error)throw error;return count??0}
function storagePath(value){
 if(!value||typeof value!=='string')return null;
 try{
  const url=new URL(value,location.origin);
  const marker='/storage/v1/object/public/aqw-social/';
  const at=url.pathname.indexOf(marker);
  if(at<0)return null;
  return decodeURIComponent(url.pathname.slice(at+marker.length));
 }catch{return null}
}
let pendingMfaFactorId='',pendingMfaChallengeId='';
async function prepareMfa(){
 const {data:aal,error:aalError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
 if(aalError)throw aalError;
 if(aal.currentLevel==='aal2')return true;
 const {data:factors,error:factorsError}=await client.auth.mfa.listFactors();
 if(factorsError)throw factorsError;
 let factor=(factors.totp||[]).find(item=>item.status==='verified');
 $('mfaSetup').classList.add('hidden');
 if(!factor){
  const stale=(factors.totp||[]).find(item=>item.status==='unverified');
  if(stale){const {error}=await client.auth.mfa.unenroll({factorId:stale.id});if(error)throw error}
  const {data:enrolled,error:enrollError}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'AQW 管理者'});
  if(enrollError)throw enrollError;
  factor=enrolled;
  $('mfaQr').src=enrolled.totp.qr_code;
  $('mfaSecret').textContent=enrolled.totp.secret;
  $('mfaSetup').classList.remove('hidden');
  $('mfaHelp').textContent='初回設定です。認証アプリにQRコードを登録し、表示された6桁のコードを入力してください。';
 }else{
  $('mfaHelp').textContent='認証アプリを開き、AQW管理者用の6桁のコードを入力してください。';
 }
 pendingMfaFactorId=factor.id;
 const {data:challenge,error:challengeError}=await client.auth.mfa.challenge({factorId:factor.id});
 if(challengeError)throw challengeError;
 pendingMfaChallengeId=challenge.id;
 $('mfaCode').value='';
 $('mfaCard').classList.remove('hidden');
 $('loginCard').classList.add('hidden');
 $('console').classList.add('hidden');
 $('mfaCode').focus();
 return false;
}
async function verifyOwner(){
 const {data,error}=await client.rpc('is_site_owner');
 if(error)throw error;
 return data===true;
}
async function startSession(session){
 activeUser=session?.user||null;
 $('console').classList.add('hidden');
 $('mfaCard').classList.add('hidden');
 if(!activeUser){$('loginCard').classList.remove('hidden');say('管理者アカウントでメールアドレスとパスワードを入力してください。');return}
 $('loginCard').classList.add('hidden');
 say('管理者権限と追加認証を確認しています…');
 try{
  const allowed=await verifyOwner();
  if(!allowed){await client.auth.signOut();activeUser=null;say('このアカウントには管理者権限がありません。','error');$('loginCard').classList.remove('hidden');return}
  const mfaReady=await prepareMfa();
  if(!mfaReady){say('管理者用の追加認証を完了してください。');return}
  clearMfaSecrets();
  $('ownerIdentity').textContent='認証済み：'+(activeUser.email||'管理者アカウント')+' · 多要素認証済み';
  $('console').classList.remove('hidden');
  say('管理者として認証されました。','success');
  await refreshAll();
 }catch(error){
  $('console').classList.add('hidden');
  $('mfaCard').classList.add('hidden');
  clearMfaSecrets();
  activeUser=null;
  try{await client.auth.signOut()}catch(_){}
  $('loginCard').classList.remove('hidden');
  say('管理者確認を完了できませんでした。安全のためログアウトしました。再度ログインしてください。','error');
 }
}
async function refreshAll(){
 $('refreshButton').disabled=true;
 try{
  const [profiles,posts,notifications,messages,pendingReports]=await Promise.all([
   count('profiles'),count('posts'),count('notifications'),count('friend_messages'),countPendingReports()
  ]);
  $('profileCount').textContent=profiles.toLocaleString('ja-JP');
  $('postCount').textContent=posts.toLocaleString('ja-JP');
  $('notificationCount').textContent=notifications.toLocaleString('ja-JP');
  $('messageCount').textContent=messages.toLocaleString('ja-JP');
  $('reportCount').textContent=pendingReports.toLocaleString('ja-JP');
  await Promise.all([loadPosts(),loadReports(),loadProfiles(),loadAuthUsers()]);
  say('管理情報を更新しました。','success');
 }catch(error){say('データを取得できませんでした：'+(error.message||String(error)),'error')}
 finally{$('refreshButton').disabled=false}
}
async function loadReports(){
 const root=$('reports');root.textContent='通報を読み込み中…';
 const {data,error}=await client.from('user_reports').select('id,reporter_id,reported_user_id,message_id,post_id,reason,details,status,created_at,reviewed_at').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 if(!data?.length){root.textContent='通報はありません。';return}
 const ids=[...new Set(data.flatMap(row=>[row.reporter_id,row.reported_user_id]))];
 const {data:profiles,error:profileError}=await client.from('profiles').select('id,username,display_name').in('id',ids);
 if(profileError)throw profileError;
 const byId=new Map((profiles||[]).map(profile=>[profile.id,profile]));
 const reasonLabels={harassment:'嫌がらせ・迷惑行為',spam:'スパム',inappropriate:'不適切な内容',other:'その他'};
 const statusLabels={pending:'未対応',reviewing:'確認中',resolved:'対応済み',dismissed:'対象外'};
 root.replaceChildren();
 for(const report of data){
  const card=document.createElement('article');card.className='post report-card';
  const header=document.createElement('div');header.className='report-meta';
  const reporter=byId.get(report.reporter_id)||{},target=byId.get(report.reported_user_id)||{};
  const title=document.createElement('strong');
  title.textContent='通報：'+(target.display_name||target.username||'不明なユーザー')+' (@'+(target.username||'unknown')+')';
  const when=document.createElement('small');when.textContent='通報者：'+(reporter.display_name||reporter.username||'不明')+' · '+date(report.created_at);
  header.append(title,when);card.append(header);
  const reason=document.createElement('p');reason.textContent='理由：'+(reasonLabels[report.reason]||report.reason);card.append(reason);
  if(report.details){const details=document.createElement('p');details.className='report-detail';details.textContent='補足：'+report.details;card.append(details)}
  const context=document.createElement('small');
  context.textContent=report.message_id?'対象：メッセージ '+report.message_id:report.post_id?'対象：投稿・返信 '+report.post_id:'対象：プロフィール';
  card.append(context);
  if(report.message_id||report.post_id){
   const view=document.createElement('button');view.type='button';view.textContent='内容を確認';
   const content=document.createElement('div');content.className='report-content hidden';content.setAttribute('aria-live','polite');
   view.addEventListener('click',async()=>{
    if(!content.classList.contains('hidden')){content.classList.add('hidden');view.textContent='内容を確認';return}
    view.disabled=true;content.textContent='読み込み中…';
    try{
     let item=null,error=null;
     if(report.message_id){const result=await client.from('friend_messages').select('body,created_at').eq('id',report.message_id).maybeSingle();item=result.data;error=result.error}
     else{const result=await client.from('posts').select('body,parent_post_id,created_at').eq('id',report.post_id).maybeSingle();item=result.data;error=result.error}
     if(error)throw error;
     content.textContent=item?(item.body||'本文はありません。'):'対象の内容は削除済み、または取得できません。';
     if(item?.created_at)content.textContent+='\n\n日時：'+date(item.created_at);
     content.classList.remove('hidden');view.textContent='内容を閉じる';
    }catch(error){content.textContent='内容を取得できませんでした：'+(error.message||String(error));content.classList.remove('hidden')}
    finally{view.disabled=false}
   });
   card.append(view,content);
  }
  const controls=document.createElement('div');controls.className='report-meta';
  const select=document.createElement('select');select.setAttribute('aria-label','通報の対応状況');
  Object.entries(statusLabels).forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)});
  select.value=report.status;
  const save=document.createElement('button');save.type='button';save.textContent='状態を保存';
  save.addEventListener('click',async()=>{
   save.disabled=true;
   const reviewed=select.value==='pending'?null:new Date().toISOString();
   const {error:updateError}=await client.from('user_reports').update({
    status:select.value,reviewed_at:reviewed,reviewed_by:reviewed?activeUser.id:null
   }).eq('id',report.id);
   if(updateError){say('通報状態を更新できませんでした：'+updateError.message,'error');save.disabled=false;return}
   say('通報状態を更新しました。','success');
   await loadReports();await countPendingReports().then(value=>{$('reportCount').textContent=value.toLocaleString('ja-JP')});
  });
  controls.append(select,save);card.append(controls);root.append(card);
 }
}
async function loadPosts(){
 const root=$('posts');root.textContent='読み込み中…';
 const {data,error}=await client.from('posts').select('id,user_id,body,image_path,parent_post_id,created_at').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 if(!data?.length){root.textContent='投稿はありません。';return}
 const ids=[...new Set(data.map(row=>row.user_id))];
 const {data:profiles,error:profileError}=await client.from('profiles').select('id,username,display_name').in('id',ids);
 if(profileError)throw profileError;
 const byId=new Map((profiles||[]).map(p=>[p.id,p]));
 root.replaceChildren();
 for(const post of data){
  const profile=byId.get(post.user_id)||{};
  const article=document.createElement('article');article.className='post';
  const head=document.createElement('div');head.className='post-head';
  const meta=document.createElement('div');
  const name=document.createElement('strong');name.textContent=(profile.display_name||profile.username||'ユーザー')+' (@'+(profile.username||'unknown')+')';
  const dateEl=document.createElement('small');dateEl.textContent=' · '+date(post.created_at)+(post.parent_post_id?' · 返信':' · 投稿');
  meta.append(name,dateEl);
  const tools=document.createElement('div');tools.className='actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='本文を編集';edit.addEventListener('click',()=>editPost(post,edit));
  const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='削除';del.addEventListener('click',()=>deletePost(post,del));
  tools.append(edit,del);head.append(meta,tools);
  const body=document.createElement('p');body.className='post-body';body.textContent=post.body||'';
  article.append(head,body);
  if(post.image_path){const img=document.createElement('img');img.loading='lazy';img.alt='投稿画像';img.src=post.image_path;img.onerror=()=>img.remove();article.append(img)}
  root.append(article);
 }
}
async function editPost(post,button){
 const next=prompt('投稿本文を編集します。',post.body||'');
 if(next===null)return;
 if(!next.trim()){say('本文を空にすることはできません。','error');return}
 button.disabled=true;
 try{const {error}=await client.from('posts').update({body:next.trim(),updated_at:new Date().toISOString()}).eq('id',post.id);if(error)throw error;say('投稿を更新しました。','success');await refreshAll()}
 catch(error){say('投稿を更新できませんでした：'+(error.message||String(error)),'error')}
 finally{button.disabled=false}
}
async function deletePost(post,button){
 if(!confirm('この投稿を削除しますか？返信・いいね・関連通知も削除されます。この操作は取り消せません。'))return;
 button.disabled=true;
 try{
  const {error}=await client.from('posts').delete().eq('id',post.id);
  if(error)throw error;
  let note='投稿と関連データを削除しました。';
  const path=storagePath(post.image_path);
  if(path){
   const {error:storageError}=await client.storage.from('aqw-social').remove([path]);
   if(storageError)note+=' 画像ファイルの削除には失敗しました：'+storageError.message;
   else note+=' 投稿画像も削除しました。';
  }
  say(note, 'success');
  await refreshAll();
 }catch(error){button.disabled=false;say('削除できませんでした：'+(error.message||String(error)),'error')}
}
const dataColumns={
 aqw_player_stats:[['user_id','ユーザーID'],['total_xp','合計XP'],['total_runs','プレイ回数'],['total_correct','正解数'],['total_questions','出題数'],['accuracy_rate','正答率'],['updated_at','更新日時']],
 aqw_speed_rush_scores:[['user_id','ユーザーID'],['correct_count','正解数'],['elapsed_ms','経過時間(ms)'],['updated_at','更新日時']],
 follows:[['follower_id','フォローしたユーザー'],['following_id','フォロー先'],['created_at','日時']],
 post_likes:[['user_id','ユーザーID'],['post_id','投稿ID'],['created_at','日時']],
 notifications:[['recipient_id','通知先'],['actor_id','実行者'],['kind','種類'],['post_id','投稿ID'],['created_at','日時']],
 friend_messages:[['sender_id','送信者'],['recipient_id','受信者'],['created_at','日時']]
};
async function loadDataRecords(){
 const table=$('dataTable').value,root=$('dataRows'),head=$('dataHead');root.replaceChildren();head.replaceChildren();
 const cols=dataColumns[table];const header=document.createElement('tr');
 for(const [,label] of cols){const th=document.createElement('th');th.textContent=label;header.append(th)}
 const op=document.createElement('th');op.textContent='操作';header.append(op);head.append(header);
 const fields=table==='friend_messages'?'id,sender_id,recipient_id,created_at':'*';
 const orderColumn=table==='aqw_player_stats'||table==='aqw_speed_rush_scores'?'updated_at':'created_at';
 const {data,error}=await client.from(table).select(fields).order(orderColumn,{ascending:false}).limit(100);
 if(error)throw error;
 if(!data?.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=cols.length+1;cell.textContent='データはありません。';row.append(cell);root.append(row);return}
 for(const record of data){
  const row=document.createElement('tr');
  for(const [key] of cols){const cell=document.createElement('td');cell.textContent=key==='created_at'||key==='updated_at'?date(record[key]):String(record[key]??'—');row.append(cell)}
  const action=document.createElement('td');const button=document.createElement('button');button.type='button';button.className='danger';button.textContent='削除';
  button.addEventListener('click',async()=>{
   if(!confirm('選択したデータを削除します。この操作は取り消せません。'))return;
   button.disabled=true;
   try{
    let query=client.from(table).delete();
    if(table==='aqw_player_stats'||table==='aqw_speed_rush_scores')query=query.eq('user_id',record.user_id);
    else if(table==='follows')query=query.eq('follower_id',record.follower_id).eq('following_id',record.following_id);
    else if(table==='post_likes')query=query.eq('user_id',record.user_id).eq('post_id',record.post_id);
    else query=query.eq('id',record.id);
    const {error:deleteError}=await query;if(deleteError)throw deleteError;
    say('データを削除しました。','success');await loadDataRecords();await refreshAll();
   }catch(error){say('削除できませんでした：'+(error.message||String(error)),'error');button.disabled=false}
  });
  action.append(button);row.append(action);root.append(row);
 }
}
async function loadAuthUsers(){
 const root=$('authUsers');root.replaceChildren();
 const users=[];
 for(let page=1;page<=100;page++){
  const {data,error}=await client.functions.invoke('aqw-admin-control',{body:{action:'list_users',page}});
  if(error)throw error;
  const batch=data?.users||[];users.push(...batch);
  if(batch.length<100)break;
 }
 if(!users.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.textContent='アカウントはありません。';row.append(cell);root.append(row);return}
 for(const user of users){
  const row=document.createElement('tr');
  const email=document.createElement('td');email.textContent=user.email||'メール未登録';row.append(email);
  const created=document.createElement('td');created.textContent=date(user.created_at);row.append(created);
  const last=document.createElement('td');last.textContent=date(user.last_sign_in_at);row.append(last);
  const banned=!!(user.banned_until&&new Date(user.banned_until).getTime()>Date.now());
  const statusCell=document.createElement('td');statusCell.textContent=user.is_admin?'管理者':banned?'利用停止中':'利用可能';row.append(statusCell);
  const action=document.createElement('td');
  if(user.is_admin){action.textContent='保護対象'}
  else{
   const button=document.createElement('button');button.type='button';button.className=banned?'primary':'danger';button.textContent=banned?'利用を再開':'利用停止';
   button.addEventListener('click',async()=>{
    const message=banned?'このアカウントの利用停止を解除しますか？':'このアカウントを利用停止にしますか？';
    if(!confirm(message))return;
    button.disabled=true;
    try{
     const {error:callError}=await client.functions.invoke('aqw-admin-control',{body:{action:'set_ban',user_id:user.id,banned:!banned}});
     if(callError)throw callError;
     say(banned?'アカウントの利用を再開しました。':'アカウントを利用停止にしました。','success');
     await loadAuthUsers();
    }catch(error){say('アカウントを変更できませんでした：'+(error.message||String(error)),'error');button.disabled=false}
   });
   action.append(button);
  }
  row.append(action);root.append(row);
 }
}
async function loadProfiles(){
 const root=$('profiles');root.replaceChildren();
 const {data,error}=await client.from('profiles').select('id,username,display_name,bio,created_at,leaderboard_enabled').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 if(!data?.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=6;cell.textContent='プロフィールはありません。';row.append(cell);root.append(row);return}
 for(const profile of data){
  const row=document.createElement('tr');
  const username=document.createElement('td');username.textContent=profile.username||'—';row.append(username);
  const displayCell=document.createElement('td');const display=document.createElement('input');display.value=profile.display_name||'';display.maxLength=40;display.setAttribute('aria-label','表示名');displayCell.append(display);row.append(displayCell);
  const dateCell=document.createElement('td');dateCell.textContent=date(profile.created_at);row.append(dateCell);
  const bioCell=document.createElement('td');const bio=document.createElement('input');bio.value=profile.bio||'';bio.maxLength=160;bio.placeholder='自己紹介';bio.setAttribute('aria-label','自己紹介');bioCell.append(bio);row.append(bioCell);
  const rankCell=document.createElement('td');const rank=document.createElement('input');rank.type='checkbox';rank.checked=!!profile.leaderboard_enabled;rank.setAttribute('aria-label','ランキング掲載');rankCell.append(rank);row.append(rankCell);
  const actionCell=document.createElement('td');const save=document.createElement('button');save.type='button';save.textContent='保存';save.addEventListener('click',async()=>{save.disabled=true;try{const {error}=await client.from('profiles').update({display_name:display.value.trim(),bio:bio.value.trim(),leaderboard_enabled:rank.checked}).eq('id',profile.id);if(error)throw error;say('プロフィールを更新しました。','success')}catch(error){say('更新できませんでした：'+(error.message||String(error)),'error')}finally{save.disabled=false}});actionCell.append(save);row.append(actionCell);
  root.append(row);
 }
}
$('mfaForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const code=$('mfaCode').value.trim();
 if(!/^[0-9]{6}$/.test(code)){say('6桁の認証コードを入力してください。','error');return}
 $('mfaVerify').disabled=true;say('追加認証を確認しています…');
 try{
  const {error}=await client.auth.mfa.verify({factorId:pendingMfaFactorId,challengeId:pendingMfaChallengeId,code});
  if(error)throw error;
  const {data,error:sessionError}=await client.auth.getSession();
  if(sessionError)throw sessionError;
  await startSession(data.session);
 }catch(error){
  $('mfaCode').value='';
  try{
   const {data:nextChallenge,error:challengeError}=await client.auth.mfa.challenge({factorId:pendingMfaFactorId});
   if(challengeError)throw challengeError;
   pendingMfaChallengeId=nextChallenge.id;
   say('認証コードを確認できませんでした。認証アプリの最新コードを入力してください。','error');
  }catch(challengeError){
   clearMfaSecrets();
   $('mfaCard').classList.add('hidden');
   $('loginCard').classList.remove('hidden');
   activeUser=null;
   try{await client.auth.signOut()}catch(_){}
   say('追加認証を再開できませんでした。安全のためログアウトしました。再度ログインしてください。','error');
  }
 }
 finally{$('mfaVerify').disabled=false}
});
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();$('loginButton').disabled=true;say('ログインしています…');
 try{const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await startSession(data.session)}
 catch(error){$('password').value='';say('ログインできませんでした：'+(error.message||String(error)),'error')}
 finally{$('loginButton').disabled=false}
});
$('logoutButton').addEventListener('click',async()=>{
 const {error}=await client.auth.signOut();
 if(error){say('ログアウトできませんでした：'+error.message,'error');return}
 await startSession(null);
});
$('refreshButton').addEventListener('click',refreshAll);
$('reloadUsers').addEventListener('click',loadAuthUsers);
$('reloadReports').addEventListener('click',()=>loadReports().catch(error=>say('通報を取得できませんでした：'+(error.message||String(error)),'error')));
$('loadData').addEventListener('click',()=>loadDataRecords().catch(error=>say('データを取得できませんでした：'+(error.message||String(error)),'error')));
$('dataTable').addEventListener('change',()=>loadDataRecords().catch(error=>say('データを取得できませんでした：'+(error.message||String(error)),'error')));
say('メールアドレスとパスワードを入力して管理者認証を行ってください。');
$('loginCard').classList.remove('hidden');
$('console').classList.add('hidden');
})();
