
const ClippingHandler_Browser = (function(){
  const state = {filenameDict: T.createDict()};

  // msg: {:text, :mineType, :filename}
  function downloadText(msg){
    const arr = [msg.text];
    const opt = {type: msg.mimeType};
    const blob = new Blob(arr, opt);
    const url = URL.createObjectURL(blob);
    downloadUrl({url: url, filename: msg.filename});
  }

  function downloadBlob(msg){
    const url = URL.createObjectURL(msg.blob);
    downloadUrl({url: url, filename: msg.filename});
  }

  function downloadUrl(msg){
    Log.debug('download.url:', msg.url);
    Log.debug('download.filename:', msg.filename);
    /*
     * Referer and User-Agent are restricted by browser( as unsafe headers) :(
     */
    ExtApi.download({
      saveAs: false,
      filename: msg.filename,
      url: msg.url
    }).then((downloadItemId) => {
      // download started successfully
      // console.log("started: ", downloadItemId, filename);
    }, (rejectMsg) => {
      Log.error(rejectMsg);
    } ).catch((err) => {
      Log.error(err);
    });
  }

  function downloadCompleted(downloadItemId){
    const filename = state.filenameDict.find(downloadItemId);
    // file that not download through maoxian web clipper
    if(T.excludeFold(filename, 'mx-wc')){ return false }
    if(  filename.endsWith('.html') && !filename.endsWith('.frame.html')
      || filename.endsWith('.md')
      || filename.endsWith('.mxwc')){
      if(filename.endsWith('.mxwc')){
        ExtApi.deleteDownloadItem(downloadItemId);
      }else{
        state.completedAction(state.tabId, {
          handler: 'browser',
          filename: filename,
          downloadItemId: downloadItemId
        });
      }
    }else{
      // erase assets download history
      browser.downloads.erase({id: downloadItemId, limit: 1});
    }
    state.filenameDict.remove(downloadItemId);
  }

  function filenameCreated(downloadItemId, filename){
    // file that not download through maoxian web clipper
    if(T.excludeFold(filename, 'mx-wc')){ return false }
    state.filenameDict.add(downloadItemId, filename);
    updateDownloadFold(filename);
  }

  function updateDownloadFold(filename){
    if(  filename.endsWith('.html') && !filename.endsWith('.frame.html')
      || filename.endsWith('.md')
      || filename.endsWith('.mxwc')){
      // Update download Fold, Cause user might change download fold.
      // Update as soon as possible.
      const downloadFold = filename.split('mx-wc')[0];
      MxWcStorage.set('downloadFold', downloadFold);
    }
  }

  function downloadCreated(e){
    if(e.filename){
      // firefox have filename on downloadCreated
      filenameCreated(e.id, T.sanitizePath(e.filename))
    }
  }

  //https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/onChanged#downloadDelta
  function downloadChanged(e){
    if(e.filename && e.filename.current){
      // chrome have firename on downloadChanged
      filenameCreated(e.id, T.sanitizePath(e.filename.current));
    }
    if(e.state && e.state.current === 'complete'){
      downloadCompleted(e.id);
    }
  }

  function initDownloadFold(){
    init();
    downloadText({
      mimeType: 'text/plain',
      text: "useless file, delete me :)",
      filename: 'mx-wc/touch.mxwc'
    });
  }

  function handle(task) {
    switch(task.type){
      case 'text': downloadText(task); break;
      case 'blob': downloadBlob(task); break;
      case 'url' : downloadUrl(task); break;
    }
  }

  function setCompletedAction(handler) {
    state.completedAction = handler;
  }

  function init(tabId, clipId){
    if(!state.tabId){
      ExtApi.bindDownloadCreatedListener(downloadCreated);
      ExtApi.bindDownloadChangedListener(downloadChanged);
    }
    state.tabId = tabId;
    state.clipId = clipId;
  }


  return {
    name: 'browser',
    init: init,
    handle: handle,
    setCompletedAction: setCompletedAction,
    initDownloadFold: initDownloadFold
  }


})();
