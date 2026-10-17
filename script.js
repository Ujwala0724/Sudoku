(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORE = "sudokuLuxeProfileV1";
  const STATS = "sudokuLuxeStatsV1";
  const USERS = "sudokuLuxeUsersV1";
  const CURRENT_USER = "sudokuLuxeCurrentEmailV1";
  const FRIENDS = "sudokuLuxeFriendsV1";
  const PUZZLES = {
    Easy: [
      "530070000","600195000","098000060","800060003","400803001","700020006","060000280","000419005","000080079"
    ],
    Medium: [
      "530070000","600195000","098000060","800060003","400803001","700020006","060000280","000419005","000080079"
    ],
    Hard: [
      "000260701","680070090","190004500","820100040","004602900","050003028","009300074","040050036","703018000"
    ],
    Expert: [
      "100007090","030020008","009600500","005300900","010080002","600004000","300000010","040000007","007000300"
    ]
  };
  const SOLUTIONS = {
    Easy: ["534678912","672195348","198342567","859761423","426853791","713924856","961537284","287419635","345286179"],
    Medium: ["534678912","672195348","198342567","859761423","426853791","713924856","961537284","287419635","345286179"],
    Hard: ["435269781","682571493","197834562","826195347","374682915","951743628","519326874","248957136","763418259"],
    Expert: ["162857493","534129678","789643521","475312986","913586742","628794135","356478219","241935867","897261354"]
  };
  const DEFAULT_PROFILE = {name:"Player",email:"",phone:"",difficulty:"Medium",interests:["Logic puzzles","Brain training"],created:false};
  const DEFAULT_STATS = {played:0,wins:0,losses:0,points:0,streak:0,bestStreak:0,history:[]};
  let profile = readStore(STORE, DEFAULT_PROFILE);
  let stats = readStore(STATS, DEFAULT_STATS);
  let game = null, timerInterval = null, toastTimeout = null, paused = false;
  const artDigits = ["1","6","8","","","9","","2","", "", "","3","","1","","","","", "","3","","6","2","","","","", "", "", "9","","","","1","","6", "", "", "1","","","","3","7","", "", "4","3","5","","","","","9", "", "", "", "8","","2","6","","", "", "", "9","","5","","2","3", "2","","6","","3","","7","",""];
  function readStore(key, fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||"{}")};}catch{return {...fallback};}}
  function save(){localStorage.setItem(STORE,JSON.stringify(profile));localStorage.setItem(STATS,JSON.stringify(stats));}
  function readUsers(){try{return JSON.parse(localStorage.getItem(USERS)||"[]");}catch{return [];}}
  function saveUsers(users){localStorage.setItem(USERS,JSON.stringify(users));}
  function enterWebsite(){document.body.classList.add("authenticated");$("#appShell").classList.remove("hidden");$("#welcomeScreen").classList.add("hidden");applyFontPreference(profile.fontPreference||"normal");renderHome();renderProfile();renderLeaderboard();renderInvite();go("home");}
  function applyFontPreference(size){document.documentElement.dataset.fontSize=size||"normal";}
  function inviteCode(email){return "SL-"+Array.from(String(email||"PLAYER").toUpperCase()).reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),7).toString(36).toUpperCase().slice(0,6).padStart(6,"0");}
  function readFriends(){try{return JSON.parse(localStorage.getItem(FRIENDS)||"[]");}catch{return [];}}
  function renderInvite(){const el=$("#inviteCode");if(el)el.textContent=profile.email?inviteCode(profile.email):"LOG IN FIRST";}
  function renderLeaderboard(){const users=readUsers(),meEmail=(localStorage.getItem(CURRENT_USER)||"").toLowerCase(),friends=readFriends(),rows=[];if(meEmail)rows.push({name:profile.name||"You",wins:stats.wins,points:stats.points,me:true});friends.forEach(email=>{const u=users.find(x=>x.email.toLowerCase()===email.toLowerCase());if(u)rows.push({name:u.name||"Friend",wins:Number(u.wins||0),points:Number(u.points||0),me:false});});rows.sort((a,b)=>b.points-a.points);const container=$("#leaderRows");if(!container)return;container.innerHTML=rows.length?rows.map((p,i)=>`<div class="leader-row"><span>${String(i+1).padStart(2,"0")}</span><span class="leader-player"><span class="rank-avatar">${escapeHTML(initials(p.name))}</span>${escapeHTML(p.name)}${p.me?' <small>(you)</small>':""}</span><span>${p.wins}</span><span>${p.points.toLocaleString()}</span></div>`).join(""):'<p class="empty-leaderboard">No scores yet. Finish a puzzle to start your leaderboard.</p>'; }
  function leaveWebsite(){
    // End the active session first so refreshes cannot restore the logged-in view.
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    game = null;
    paused = false;
    localStorage.removeItem(CURRENT_USER);
    document.body.classList.remove("authenticated");

    // Explicitly show the auth page and login form. Do not rely on a previous route.
    const shell = $("#appShell");
    const welcome = $("#welcomeScreen");
    if (shell) shell.classList.remove("hidden");
    if (welcome) welcome.classList.add("hidden");
    $$(".page").forEach(page => page.classList.toggle("active", page.id === "page-auth"));
    $$(".nav-link").forEach(link => link.classList.remove("active"));
    $("#signupForm").classList.add("hidden");
    $("#loginForm").classList.remove("hidden");
    $$(".auth-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.auth === "login"));
    $("#loginPassword").value = "";
    $("#loginEmail").value = "";
    window.scrollTo({ top: 0, behavior: "auto" });
    showToast("You have been logged out. Log in or create a new account.");
  }
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function initials(name){return (name||"P").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"P";}
  function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove("show"),2500);}
  function go(page){const target=$("#page-"+page);if(!target)return;$$(".page").forEach(p=>p.classList.toggle("active",p===target));$$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page||(page==="game"||page==="results")&&b.dataset.page==="levels"));window.scrollTo({top:0,behavior:"smooth"});if(page==="profile")renderProfile();if(page==="home")renderHome();if(page==="leaderboard")renderLeaderboard();if(page==="results")renderResult();}
  document.addEventListener("click",e=>{const pageBtn=e.target.closest("[data-page]");if(pageBtn){e.preventDefault();if(!localStorage.getItem(CURRENT_USER)&&pageBtn.dataset.page!=="auth"){showAuth("login");return;}go(pageBtn.dataset.page);return;}const levelBtn=e.target.closest("[data-level]");if(levelBtn){startGame(levelBtn.dataset.level);return;}const authBtn=e.target.closest("[data-auth]");if(authBtn){showAuth(authBtn.dataset.auth);return;}const action=e.target.closest("[data-action]");if(action?.dataset.action==="play-again")startGame(game?.level||profile.difficulty||"Medium");});
  function showAuth(which){
    $("#signupForm").classList.toggle("hidden",which!=="signup");
    $("#loginForm").classList.toggle("hidden",which!=="login");
    $$(".auth-tab").forEach(b=>b.classList.toggle("active",b.dataset.auth===which));
    $("#appShell").classList.remove("hidden");$("#welcomeScreen").classList.add("hidden");
    document.body.classList.remove("authenticated");
    go("auth");
  }
  function renderArt(){const board=$("#artBoard");board.innerHTML="";for(let i=0;i<81;i++){const cell=document.createElement("div");cell.className="art-cell";cell.textContent=artDigits[i]||"";board.append(cell);}}
  function renderHome(){$("#homePlayed").textContent=stats.played;$("#homeWins").textContent=stats.wins;$("#homePoints").textContent=stats.points;$("#headerName").textContent=profile.name||"Player";$("#headerAvatar").textContent=initials(profile.name);}
  function renderProfile(){const name=profile.name||"Player";$("#profileAvatar").textContent=initials(name);$("#profileDisplayName").textContent=name;$("#profileDisplayEmail").textContent=profile.email||"No email added";$("#profileName").value=profile.name==="Player"?"":profile.name;$("#profileEmail").value=profile.email||"";$("#profilePhone").value=profile.phone||"";$("#profileDifficulty").value=profile.difficulty||"Medium";$("#profilePlayed").textContent=stats.played;$("#profileWins").textContent=stats.wins;$("#profileLosses").textContent=stats.losses;$("#profilePoints").textContent=stats.points;$("#headerName").textContent=name;$("#headerAvatar").textContent=initials(name);}
  function shuffled(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function makeRandomSolution(){
    const board=Array(81).fill(0);
    function candidates(index){const r=Math.floor(index/9),c=index%9,used=new Set();for(let k=0;k<9;k++){used.add(board[r*9+k]);used.add(board[k*9+c]);}const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let y=br;y<br+3;y++)for(let x=bc;x<bc+3;x++)used.add(board[y*9+x]);return shuffled([1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n)));}
    function solve(index){if(index===81)return true;if(board[index])return solve(index+1);for(const n of candidates(index)){board[index]=n;if(solve(index+1))return true;board[index]=0;}return false;}
    solve(0);return board;
  }
  function makePuzzle(level){const solution=makeRandomSolution();const puzzle=[...solution];const clues={Easy:40,Medium:32,Hard:27,Expert:23}[level]||32;const cells=shuffled(Array.from({length:81},(_,i)=>i));for(let i=0;i<81-clues;i++)puzzle[cells[i]]=0;return {solution:solution.join(""),puzzle:puzzle.join("")};}
  function startGame(level){clearInterval(timerInterval);level=level||profile.difficulty||"Medium";const generated=makePuzzle(level);const solution=generated.solution,puzzle=generated.puzzle;game={level,solution,puzzle,board:puzzle.split("").map(Number),given:puzzle.split("").map(x=>x!=="0"),selected:-1,seconds:0,hints:3,history:[],notes:Array.from({length:81},()=>new Set()),notesMode:false,wrong:0,paused:false,startedAt:Date.now()};paused=false;$("#gameLevel").textContent=level;$("#hintsLeft").textContent=game.hints;$("#wrongMovesCount").textContent="0";$("#notesLabel").textContent="Notes off";$("#notesButton").classList.remove("used");$("#gameMessage").textContent="New puzzle generated. Select an empty cell, then choose a number.";renderBoard();renderPad();updateProgress();updateTimer();timerInterval=setInterval(()=>{if(game&&!game.paused){game.seconds++;updateTimer();}},1000);go("game");}
  function renderBoard(){const board=$("#sudokuBoard");board.innerHTML="";for(let i=0;i<81;i++){const cell=document.createElement("button");cell.type="button";cell.className="cell";cell.dataset.index=i;cell.setAttribute("role","gridcell");cell.setAttribute("aria-label",`Row ${Math.floor(i/9)+1}, column ${i%9+1}${game.board[i]?", number "+game.board[i]:" empty"}`);if(game.given[i])cell.classList.add("given");if(!game.given[i]&&game.board[i]&&Number(game.board[i])!==Number(game.solution[i]))cell.classList.add("wrong-move");if(game.selected===i)cell.classList.add("selected");if(game.selected>=0){const sr=Math.floor(game.selected/9),sc=game.selected%9,r=Math.floor(i/9),c=i%9;if(r===sr||c===sc||(Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(c/3)===Math.floor(sc/3)))cell.classList.add("related");if(game.board[i]&&game.board[i]===game.board[game.selected])cell.classList.add("same-number");}if(game.board[i])cell.textContent=game.board[i];else if(game.notes[i].size){const note=document.createElement("span");note.className="notes";note.innerHTML=Array.from({length:9},(_,n)=>`<span>${game.notes[i].has(n+1)?n+1:""}</span>`).join("");cell.append(note);}board.append(cell);}}
  function renderPad(){const pad=$("#numberPad");pad.innerHTML="";for(let n=1;n<=9;n++){const b=document.createElement("button");b.type="button";b.textContent=n;b.dataset.number=n;if(game.board.filter(v=>v===n).length>=9)b.classList.add("used");pad.append(b);}}
  function updateProgress(){if(!game)return;const filled=game.board.filter(Boolean).length,pct=Math.round(filled/81*100);$("#progressBar").style.width=pct+"%";$("#filledCount").textContent=`${filled} / 81 cells` ;$("#progressPercent").textContent=pct+"%";}
  function updateTimer(){$("#timer").textContent=formatTime(game?.seconds||0);}
  function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
  function validAt(board,index,value){const row=Math.floor(index/9),col=index%9;for(let i=0;i<9;i++){if(i!==col&&board[row*9+i]===value)return false;if(i!==row&&board[i*9+col]===value)return false;}const br=Math.floor(row/3)*3,bc=Math.floor(col/3)*3;for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++){const i=r*9+c;if(i!==index&&board[i]===value)return false;}return true;}
  function enterNumber(n){if(!game||game.paused)return;if(game.selected<0){showToast("Choose an empty cell first.");return;}const i=game.selected;if(game.given[i]){showToast("That number is fixed.");return;}if(game.notesMode){if(game.notes[i].has(n))game.notes[i].delete(n);else game.notes[i].add(n);renderBoard();return;}game.history.push({index:i,value:game.board[i],notes:[...game.notes[i]]});game.board[i]=n;game.wrong=game.board.reduce((count,value,index)=>count+(!game.given[index]&&value&&Number(value)!==Number(game.solution[index])?1:0),0);$("#wrongMovesCount").textContent=game.wrong;game.notes[i].clear();renderBoard();renderPad();updateProgress();if(game.board.every((v,j)=>v===Number(game.solution[j]))){finishGame();}else if(n!==Number(game.solution[i]))$("#gameMessage").textContent="Not quite — check the row, column, and 3×3 box.";else $("#gameMessage").textContent="";}
  $("#sudokuBoard").addEventListener("click",e=>{const cell=e.target.closest(".cell");if(!cell||!game)return;const i=Number(cell.dataset.index);if(game.given[i]){game.selected=i;renderBoard();return;}game.selected=i;renderBoard();});
  $("#numberPad").addEventListener("click",e=>{const b=e.target.closest("[data-number]");if(b)enterNumber(Number(b.dataset.number));});
  $("#undoButton").addEventListener("click",()=>{if(!game||!game.history.length)return showToast("Nothing to undo yet.");const last=game.history.pop();game.board[last.index]=last.value;game.notes[last.index]=new Set(last.notes);game.selected=last.index;renderBoard();renderPad();updateProgress();});
  $("#eraseButton").addEventListener("click",()=>{if(!game||game.selected<0)return showToast("Choose a cell first.");const i=game.selected;if(game.given[i])return showToast("Fixed numbers cannot be erased.");game.history.push({index:i,value:game.board[i],notes:[...game.notes[i]]});game.board[i]=0;game.notes[i].clear();game.wrong=game.board.reduce((count,value,index)=>count+(!game.given[index]&&value&&Number(value)!==Number(game.solution[index])?1:0),0);$("#wrongMovesCount").textContent=game.wrong;renderBoard();renderPad();updateProgress();});
  $("#hintButton").addEventListener("click",()=>{if(!game||game.paused)return;if(game.hints<=0)return showToast("No hints left for this puzzle.");let i=game.selected;if(i<0||game.given[i]||game.board[i]===Number(game.solution[i]))i=game.board.findIndex((v,j)=>!game.given[j]&&v!==Number(game.solution[j]));if(i<0)return finishGame();game.history.push({index:i,value:game.board[i],notes:[...game.notes[i]]});game.board[i]=Number(game.solution[i]);game.notes[i].clear();game.wrong=game.board.reduce((count,value,index)=>count+(!game.given[index]&&value&&Number(value)!==Number(game.solution[index])?1:0),0);$("#wrongMovesCount").textContent=game.wrong;game.hints--;$("#hintsLeft").textContent=game.hints;game.selected=i;renderBoard();renderPad();updateProgress();$("#gameMessage").textContent="A little nudge in the right direction.";if(game.board.every((v,j)=>v===Number(game.solution[j])))finishGame();});
  $("#resetButton").addEventListener("click",()=>{if(!game)return;if(!confirm("Reset this puzzle to its starting state?"))return;const level=game.level;startGame(level);});
  $("#notesButton").addEventListener("click",()=>{if(!game)return;game.notesMode=!game.notesMode;$("#notesLabel").textContent=game.notesMode?"Notes on":"Notes off";$("#notesButton").classList.toggle("used",game.notesMode);showToast(game.notesMode?"Notes mode enabled":"Notes mode disabled");});
  $("#checkButton").addEventListener("click",()=>{if(!game)return;let errors=0;for(let i=0;i<81;i++){if(!game.given[i]&&game.board[i]&&!validAt(game.board,i,game.board[i]))errors++;}$("#gameMessage").textContent=errors?`${errors} number(s) conflict with their row, column, or box.`:"No row, column, or box conflicts found.";showToast(errors?`${errors} conflict(s) found`:"No conflicts found");});
  $("#pauseButton").addEventListener("click",()=>{if(!game)return;game.paused=!game.paused;$("#pauseButton").innerHTML=game.paused?'▶<small>Resume</small>':'Ⅱ<small>Pause</small>';$("#gameMessage").textContent=game.paused?"Timer paused. Resume when ready.":"Timer resumed. You’ve got this.";$("#sudokuBoard").style.opacity=game.paused?".35":"1";$("#numberPad").style.opacity=game.paused?".35":"1";});
  function finishGame(){if(!game)return;clearInterval(timerInterval);const seconds=game.seconds;const points=Math.max(50,500-Math.floor(seconds/10)-game.wrong*10+game.hints*5);stats.played++;stats.wins++;stats.points+=points;stats.streak++;stats.bestStreak=Math.max(stats.bestStreak,stats.streak);stats.history.unshift({level:game.level,seconds,points});stats.history=stats.history.slice(0,20);save();renderProfile();renderHome();renderLeaderboard();$("#resultTime").textContent=formatTime(seconds);$("#resultAccuracy").textContent=Math.max(0,Math.round((81-game.wrong)/81*100))+"%";$("#resultPoints").textContent=points;$("#resultPraise").textContent=seconds<600&&game.wrong<3?"Excellent performance!":"Well played!";go("results");}
  function renderResult(){if(!game)return;$("#resultAvatar").textContent=initials(profile.name);$("#resultName").textContent=profile.name||"Player";$("#resultPlayed").textContent=stats.played;$("#resultWins").textContent=stats.wins;$("#resultLosses").textContent=stats.losses;$("#resultStreak").textContent=stats.bestStreak;$("#resultLevel").textContent="Level "+(Math.floor(stats.points/500)+1);$("#resultXP").textContent=`${stats.points%500} / 500 XP`;}
  $("#profileEditForm").addEventListener("submit",e=>{e.preventDefault();profile.name=$("#profileName").value.trim()||"Player";profile.email=$("#profileEmail").value.trim();profile.phone=$("#profilePhone").value.trim();profile.difficulty=$("#profileDifficulty").value;save();renderProfile();renderHome();showToast("Profile updated.");});
  $("#editProfileButton").addEventListener("click",()=>$("#profileName").focus());
  $("#profileDifficulty").addEventListener("change",e=>{profile.difficulty=e.target.value;save();showToast("Preferred difficulty saved.");});
  $("#signupForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("#signupName").value.trim(), email=$("#signupEmail").value.trim().toLowerCase(), phone=$("#signupPhone").value.trim(), password=$("#signupPassword").value;
    const interests=$$('input[name="interest"]:checked',$("#signupForm")).map(x=>x.value);
    if(!interests.length){showToast("Choose at least one interest.");return;}
    const users=readUsers();
    if(users.some(user=>user.email===email)){showToast("An account with this email already exists. Please log in.");showAuth("login");$("#loginEmail").value=email;return;}
    const account={name,email,phone,password,fontPreference:$("#fontPreference")?.value||"normal",difficulty:$('input[name="difficulty"]:checked',$("#signupForm")).value,interests,created:true};
    users.push(account);saveUsers(users);localStorage.setItem(CURRENT_USER,email);
    profile={...profile,...account};delete profile.password;save();
    enterWebsite();showToast(`Welcome to Sudoku Luxe, ${name.split(/\s+/)[0]}!`);$("#signupForm").reset();
  });
  $("#loginForm").addEventListener("submit",e=>{
    e.preventDefault();const email=$("#loginEmail").value.trim().toLowerCase(),password=$("#loginPassword").value;
    const account=readUsers().find(user=>user.email===email&&user.password===password);
    if(!account){showToast("Email or password is incorrect. Try again or create an account.");return;}
    localStorage.setItem(CURRENT_USER,email);profile={...DEFAULT_PROFILE,...account};delete profile.password;save();
    enterWebsite();showToast(`Welcome back, ${account.name.split(/\s+/)[0]}!`);$("#loginForm").reset();
  });
  $("#welcomeSignup").addEventListener("click",()=>showAuth("signup"));
  $("#welcomeLogin").addEventListener("click",()=>showAuth("login"));
  const authBrandLink = $("#authBrandLink");
  if (authBrandLink) authBrandLink.addEventListener("click", e => { e.preventDefault(); $("#backWelcome")?.click(); });
  $("#backWelcome").addEventListener("click",()=>{ $("#appShell").classList.add("hidden");$("#welcomeScreen").classList.remove("hidden");document.body.classList.remove("authenticated"); });
  $("#logoutButton").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); leaveWebsite(); });
  // This is a frontend-only demo. Passwords are stored in localStorage and are NOT secure for production use.
  function restoreSession(){const email=localStorage.getItem(CURRENT_USER);if(!email)return;const account=readUsers().find(user=>user.email===email);if(!account){localStorage.removeItem(CURRENT_USER);return;}profile={...DEFAULT_PROFILE,...account};delete profile.password;save();document.body.classList.add("authenticated");$("#appShell").classList.remove("hidden");$("#welcomeScreen").classList.add("hidden");renderHome();renderProfile();go("home");}
  $("#notificationButton").addEventListener("click",()=>showToast("You’re all caught up."));
  $("#copyInviteButton")?.addEventListener("click",async()=>{if(!profile.email)return showToast("Log in first to get your invite code.");const code=inviteCode(profile.email);try{await navigator.clipboard.writeText(code);showToast("Invite code copied: "+code);}catch{showToast("Your invite code is "+code);}});
  $("#addFriendButton")?.addEventListener("click",()=>{const code=$("#friendCodeInput").value.trim().toUpperCase();if(!code)return showToast("Enter a friend's invite code.");const user=readUsers().find(u=>inviteCode(u.email)===code);if(!user)return showToast("That code isn't registered in this browser. Cross-device invites need an online backend.");if(user.email.toLowerCase()===String(profile.email).toLowerCase())return showToast("That's your own invite code.");const friends=readFriends();if(!friends.includes(user.email))friends.push(user.email);localStorage.setItem(FRIENDS,JSON.stringify(friends));$("#friendCodeInput").value="";$("#inviteStatus").textContent="Added "+user.name+" to this browser's friends list.";renderLeaderboard();showToast("Friend added to leaderboard.");});
  const fontPreference=$("#fontPreference");if(fontPreference)fontPreference.addEventListener("change",()=>applyFontPreference(fontPreference.value));
  document.addEventListener("keydown",e=>{if(!game||!$("#page-game").classList.contains("active"))return;if(/^[1-9]$/.test(e.key)){enterNumber(Number(e.key));}else if(e.key==="Backspace"||e.key==="Delete")$("#eraseButton").click();else if(e.key==="ArrowUp"||e.key==="ArrowDown"||e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();const current=game.selected<0?0:game.selected;const delta=e.key==="ArrowUp"?-9:e.key==="ArrowDown"?9:e.key==="ArrowLeft"?-1:1;game.selected=Math.max(0,Math.min(80,current+delta));renderBoard();}});
  renderArt();renderHome();renderProfile();renderLeaderboard();
  const welcomeBoard=$("#welcomeBoard");if(welcomeBoard){welcomeBoard.innerHTML="";for(let i=0;i<81;i++){const cell=document.createElement("div");cell.className="art-cell";cell.textContent=artDigits[i]||"";welcomeBoard.append(cell);}}
  restoreSession();
})();