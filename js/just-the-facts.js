// Forked/hacked for Squirt: github.com/cameron/squirt

/* Original Source:  http://code.google.com/p/arc90labs-readability
 * Copyright (c) 2010 Arc90 Inc
 * Readability is licensed under the Apache License, Version 2.0.
 **/

var dbg = function() {};

var readability = {
  flags:                   0x1 | 0x2 | 0x4,   /* Start with all flags set. */

  /* constants */
  FLAG_STRIP_UNLIKELYS:     0x1,
  FLAG_WEIGHT_CLASSES:      0x2,
  FLAG_CLEAN_CONDITIONALLY: 0x4,

  regexps: {
    unlikelyCandidates:    /ad|aside|combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter|figure|figcaption/i,
    okMaybeItsACandidate:  /and|article|body|column|main|shadow/i,
    positive:              /article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/i,
    negative:              /combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/i,
    extraneous:            /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single/i,
    divToPElements:        /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
    replaceBrs:            /(<br[^>]*>[ \n\r\t]*){2,}/gi,
    replaceFonts:          /<(\/?)font[^>]*>/gi,
    trim:                  /^\s+|\s+$/g,
    normalize:             /\s{2,}/g,
    killBreaks:            /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
    videos:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
    skipFootnoteLink:      /^\s*(\[?[a-z0-9]{1,2}\]?|^|edit|citation needed)\s*$/i,
    nextLink:              /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i, // Match: next, continue, >, >>, » but not >|, »| as those usually mean last.
    prevLink:              /(prev|earl|old|new|<|«)/i
  },

  // Get the article title as an H1.
  getArticleTitle: function () {
    var curTitle = "",
        origTitle = "";

    try {
      curTitle = origTitle = document.title;

      if(typeof curTitle !== "string") { /* If they had an element with id "title" in their HTML */
        curTitle = origTitle = document.getElementsByTagName('title')[0].textContent;
      }
    }
    catch(e) {}

    if(curTitle.match(/ [\|\-] /))
    {
      curTitle = origTitle.replace(/(.*)[\|\-] .*/gi,'$1');

      if(curTitle.split(' ').length < 3) {
        curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/gi,'$1');
      }
    }
    else if(curTitle.indexOf(': ') !== -1)
    {
      curTitle = origTitle.replace(/.*:(.*)/gi, '$1');

      if(curTitle.split(' ').length < 3) {
        curTitle = origTitle.replace(/[^:]*[:](.*)/gi,'$1');
      }
    }
    else if(curTitle.length > 150 || curTitle.length < 15)
    {
      var hOnes = document.getElementsByTagName('h1');
      if(hOnes.length === 1)
      {
        curTitle = hOnes[0].textContent;
      }
    }

    curTitle = curTitle.replace( readability.regexps.trim, "" );

    if(curTitle.split(' ').length <= 4) {
      curTitle = origTitle;
    }

    var articleTitle = document.createElement("H1");
    articleTitle.innerHTML = curTitle;

    return articleTitle;
  },

  prepArticle: function (articleContent) {
    readability.killBreaks(articleContent);

    /* Clean out junk from the article content */
    readability.cleanConditionally(articleContent, "form");
    readability.clean(articleContent, "object");
    readability.clean(articleContent, "h1");

    /**
     * If there is only one h2, they are probably using it
     * as a header and not a subheader, so remove it since we already have a header.
     ***/
    if(articleContent.getElementsByTagName('h2').length === 1) {
      readability.clean(articleContent, "h2");
    }
    readability.clean(articleContent, "iframe");

    readability.cleanHeaders(articleContent);

    /* Do these last as the previous stuff may have removed junk that will affect these */
    readability.cleanConditionally(articleContent, "table");
    readability.cleanConditionally(articleContent, "ul");
    readability.cleanConditionally(articleContent, "div");

    /* Remove extra paragraphs */
    var articleParagraphs = articleContent.getElementsByTagName('p');
    for(var i = articleParagraphs.length-1; i >= 0; i-=1) {
      var imgCount    = articleParagraphs[i].getElementsByTagName('img').length;
      var embedCount  = articleParagraphs[i].getElementsByTagName('embed').length;
      var objectCount = articleParagraphs[i].getElementsByTagName('object').length;

      if(imgCount === 0 && embedCount === 0 && objectCount === 0 && articleParagraphs[i].textContent === '') {
        articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
      }
    }

    try {
      articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');
    }
    catch (e) {
      dbg("Cleaning innerHTML of breaks failed. This is an IE strict-block-elements bug. Ignoring.: " + e);
    }
  },

  /**
   * Initialize a node with the readability object. Also checks the
   * className/id for special names to add to its score.
   *
   * @param Element
   * @return void
   **/
  initializeNode: function (node) {
    node.readability = {"contentScore": 0};

    switch(node.tagName) {
      case 'DIV':
      node.readability.contentScore += 5;
      break;

      case 'PRE':
      case 'TD':
      case 'BLOCKQUOTE':
      node.readability.contentScore += 3;
      break;

      case 'ADDRESS':
      case 'OL':
      case 'UL':
      case 'DL':
      case 'DD':
      case 'DT':
      case 'LI':
      case 'FORM':
      node.readability.contentScore -= 3;
      break;

      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
      case 'TH':
      node.readability.contentScore -= 5;
      break;
    }

    node.readability.contentScore += readability.getClassWeight(node);
  },

  candidateFetcherForDomain: {
    'getpocket.com': function(){
      return document.querySelector('.text_body p');
    },
    'medium.com': function(){
      return document.querySelector('.post-content');
    }
  },

  getBestTextNode: function(){

    var stripUnlikelyCandidates = readability.flagIsActive(readability.FLAG_STRIP_UNLIKELYS);

    var page = document.body.cloneNode(true);

    var pageCacheHtml = page.innerHTML;

    var allElements = page.getElementsByTagName('*');

    /**
     * First, node prepping. Trash nodes that look cruddy (like ones with the
     * class name "comment", etc), and turn divs into P tags where they have
     * been used inappropriately (as in, where they contain no other block
     * level elements.)
     *
     * Note: Assignment from index for performance. See
     * http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5
     * TODO: Shouldn't this be a reverse traversal?
     **/
    var node = null;
    var nodesToScore = [];
    var nodeIndex;
    var remove = function(node){
      node.remove();
      nodeIndex--;
    }
    for(nodeIndex = 0; (node = allElements[nodeIndex]); nodeIndex+=1) {
      if(node.tagName == 'svg'){ remove(node); continue; }
      if (stripUnlikelyCandidates) {
        var unlikelyMatchString = node.className + node.id + node.tagName;
        if (unlikelyMatchString.search(readability.regexps.unlikelyCandidates)
         !== -1 &&
            unlikelyMatchString.search(readability.regexps.okMaybeItsACandidate)
                === -1 &&
            node.tagName !== "BODY"){
          remove(node);
          continue;
        }
      }

      if (node.tagName === "P" || node.tagName === "TD" ||
          node.tagName === "PRE") {
        nodesToScore[nodesToScore.length] = node;
      }

      /* Turn all divs that don't have children block level elements into p's */
      if (node.tagName === "DIV") {
        if (node.innerHTML.search(readability.regexps.divToPElements) === -1) {
          var newNode = document.createElement('p');
          try {
            newNode.innerHTML = node.innerHTML;
            node.parentNode.replaceChild(newNode, node);
            nodeIndex-=1;

            nodesToScore[nodesToScore.length] = node;
          }
          catch(e) {
            dbg("Could not alter div to p, probably an IE restriction, reverting back to div.: " + e);
          }
        } else {
          /* EXPERIMENTAL */
          for(var i = 0, il = node.childNodes.length; i < il; i+=1) {
            var childNode = node.childNodes[i];
            if(childNode.nodeType === 3) { // Node.TEXT_NODE
              var p = document.createElement('p');
              p.innerHTML = childNode.nodeValue;
              p.style.display = 'inline';
              p.className = 'readability-styled';
              childNode.parentNode.replaceChild(p, childNode);
            }
          }
        }
      }
    }

    /**
     * Loop through all paragraphs, and assign a score to them based on how
     * content-y they look.
     *
     * Then add their score to their parent node.
     *
     * A score is determined by things like number of commas, class names,
     * etc. Maybe eventually link density.
     **/
    var candidates = [];
    for (var pt=0; pt < nodesToScore.length; pt+=1) {
      var parentNode      = nodesToScore[pt].parentNode;
      var grandParentNode = parentNode ? parentNode.parentNode : null;
      var innerText       = nodesToScore[pt].textContent;

      if(!parentNode || typeof(parentNode.tagName) === 'undefined') {
        continue;
      }

      /* If this paragraph is less than 25 characters, don't even count it. */
      if(innerText.length < 25) continue

      /* Initialize readability data for the parent. */
      if(typeof parentNode.readability === 'undefined') {
        readability.initializeNode(parentNode);
        candidates.push(parentNode);
      }

      /* Initialize readability data for the grandparent. */
      if(grandParentNode && typeof(grandParentNode.readability) === 'undefined' && typeof(grandParentNode.tagName) !== 'undefined') {
        readability.initializeNode(grandParentNode);
        candidates.push(grandParentNode);
      }

      var contentScore = 0;

      /* Add a point for the paragraph itself as a base. */
      contentScore+=1;

      /* Add points for any commas within this paragraph */
      contentScore += innerText.split(',').length;

      /* For every 100 characters in this paragraph, add another point. Up to 3 points. */
      contentScore += Math.min(Math.floor(innerText.length / 100), 3);

      /* Add the score to the parent. The grandparent gets half. */
      parentNode.readability.contentScore += contentScore;

      if(grandParentNode) {
        grandParentNode.readability.contentScore += contentScore/2;
      }
    }

    /**
     * After we've calculated scores, loop through all of the possible candidate nodes we found
     * and find the one with the highest score.
     **/
    var topCandidate = null;
    for(var c=0, cl=candidates.length; c < cl; c+=1)
    {
      /**
       * Scale the final candidates score based on link density. Good content should have a
       * relatively small link density (5% or less) and be mostly unaffected by this operation.
       **/
      candidates[c].readability.contentScore = candidates[c].readability.contentScore * (1-readability.getLinkDensity(candidates[c]));

      dbg('Candidate: ' + candidates[c] + " (" + candidates[c].className + ":" + candidates[c].id + ") with score " + candidates[c].readability.contentScore);

      if(!topCandidate || candidates[c].readability.contentScore > topCandidate.readability.contentScore) {
        topCandidate = candidates[c]; }
    }

    /**
     * If we still have no top candidate, just use the body as a last resort.
     * We also have to copy the body node so it is something we can modify.
     **/
    if (topCandidate === null || topCandidate.tagName === "BODY")
    {
      topCandidate = document.createElement("DIV");
      topCandidate.innerHTML = page.innerHTML;
      page.innerHTML = "";
      page.appendChild(topCandidate);
      readability.initializeNode(topCandidate);
    }
    return topCandidate;
  },

  grabArticle: function () {
    var bestTextNode, getter = readability.candidateFetcherForDomain[window.location.host];
    if(getter && (bestTextNode = getter())){
      readability.initializeNode(bestTextNode);
    } else {
      bestTextNode = readability.getBestTextNode();
    }
    return readability.getContentViaCandidate(bestTextNode);
  },

  getContentViaCandidate: function(candidate){

    /**
     * Now that we have the top candidate, look through its siblings for content that might also be related.
     * Things like preambles, content split by ads that we removed, etc.
     **/
    var articleContent        = document.createElement("DIV");
    var siblingScoreThreshold = Math.max(10, candidate.readability.contentScore * 0.2);
    var siblingNodes          = candidate.parentNode.childNodes;


    for(var s=0, sl=siblingNodes.length; s < sl; s+=1) {
      var siblingNode = siblingNodes[s];
      var append      = false;

      /**
       * Fix for odd IE7 Crash where siblingNode does not exist even though this should be a live nodeList.
       * Example of error visible here: http://www.esquire.com/features/honesty0707
       **/
      if(!siblingNode) {
        continue;
      }

      dbg("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.readability !== 'undefined') ? (" with score " + siblingNode.readability.contentScore) : ''));
      dbg("Sibling has score " + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

      if(siblingNode === candidate)
      {
        append = true;
      }

      var contentBonus = 0;
      /* Give a bonus if sibling nodes and top candidates have the example same classname */
      if(siblingNode.className === candidate.className && candidate.className !== "") {
        contentBonus += candidate.readability.contentScore * 0.2;
      }

      if(typeof siblingNode.readability !== 'undefined' && (siblingNode.readability.contentScore+contentBonus) >= siblingScoreThreshold)
      {
        append = true;
      }

      if(siblingNode.nodeName === "P") {
        var linkDensity = readability.getLinkDensity(siblingNode);
        var nodeContent = siblingNode.textContent;
        var nodeLength  = nodeContent.length;

        if(nodeLength > 80 && linkDensity < 0.25)
        {
          append = true;
        }
        else if(nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1)
        {
          append = true;
        }
      }

      if(append) {
        dbg("Appending node: " + siblingNode);

        var nodeToAppend = null;
        if(siblingNode.nodeName !== "DIV" && siblingNode.nodeName !== "P") {
          /* We have a node that isn't a common block level element, like a form or td tag. Turn it into a div so it doesn't get filtered out later by accident. */

          dbg("Altering siblingNode of " + siblingNode.nodeName + ' to div.');
          nodeToAppend = document.createElement("DIV");
          try {
            nodeToAppend.id = siblingNode.id;
            nodeToAppend.innerHTML = siblingNode.innerHTML;
          }
          catch(er) {
            dbg("Could not alter siblingNode to div, probably an IE restriction, reverting back to original.");
            nodeToAppend = siblingNode;
            s-=1;
            sl-=1;
          }
        } else {
          nodeToAppend = siblingNode;
          s-=1;
          sl-=1;
        }

        /* To ensure a node does not interfere with readability styles, remove its classnames */
        nodeToAppend.className = "";

        /* Append sibling and subtract from our list because it removes the node when you append to another node */
        articleContent.appendChild(nodeToAppend);
      }
    }

    /**
     * So we have all of the content that we need. Now we clean it up for presentation.
     **/
    readability.prepArticle(articleContent);

    if (readability.curPageNum === 1) {
      articleContent.innerHTML = '<div id="readability-page-1" class="page">' + articleContent.innerHTML + '</div>';
    }

    /**
     * Now that we've gone through the full algorithm, check to see if we got
     * any meaningful content.
     *
     * If we didn't, we may need to re-run grabArticle with different flags
     * set. This gives us a higher likelihood of finding the content, and
     * the sieve approach gives us a higher likelihood of finding the
     * -right- content.
     **/
    if(articleContent.textContent.length < 250) {

      if (readability.flagIsActive(readability.FLAG_STRIP_UNLIKELYS)) {
        readability.removeFlag(readability.FLAG_STRIP_UNLIKELYS);
        return readability.grabArticle();
      }
      else if (readability.flagIsActive(readability.FLAG_WEIGHT_CLASSES)) {
        readability.removeFlag(readability.FLAG_WEIGHT_CLASSES);
        return readability.grabArticle();
      }
      else if (readability.flagIsActive(readability.FLAG_CLEAN_CONDITIONALLY)) {
        readability.removeFlag(readability.FLAG_CLEAN_CONDITIONALLY);
        return readability.grabArticle();
      } else {
        return null;
      }
    }

    return articleContent;
  },

  // with line breaks between paragraphs
  // --cam
  grabArticleText: function extract(node){
    node = node || readability.grabArticle();
    if(!node) return '';
    var child, nodeName, text = '';
    for(var childIdx = 0; childIdx < node.childNodes.length; childIdx++){
      child = node.childNodes[childIdx];
      nodeName = child.nodeName.toLowerCase();
      if(nodeName == "#text"){
        text += child.nodeValue.replace(/^\n+/, "").replace(/\n+$/, "");
      } else {
        text += extract(child);
      }
    };
    nodeName = node.nodeName.toLowerCase();
    if(nodeName.match(/p|div|blockquote|h[1-6]|li/)){
      if(text[text.length - 1] != '\n') text += '\n'
      text += ' ';
    }
    return text;
  },

  /**
   * Get the number of times a string s appears in the node e.
   *
   * @param Element
   * @param string - what to split on. Default is ","
   * @return number (integer)
   **/
  getCharCount: function (e,s) {
    s = s || ",";
    return e.textContent.split(s).length-1;
  },


  /**
   * Get the density of links as a percentage of the content
   * This is the amount of text that is inside a link divided by the total text in the node.
   *
   * @param Element
   * @return number (float)
   **/
  getLinkDensity: function (e) {
    var links      = e.getElementsByTagName("a");
    var textLength = e.textContent.length;
    var linkLength = 0;
    for(var i=0, il=links.length; i<il;i+=1)
    {
      linkLength += links[i].textContent.length;
    }

    return linkLength / textLength;
  },

  getClassWeight: function (e) {
    if(!readability.flagIsActive(readability.FLAG_WEIGHT_CLASSES)) {
      return 0;
    }

    var weight = 0;

    /* Look for a special classname */
    if (typeof(e.className) === 'string' && e.className !== '')
    {
      if(e.className.search(readability.regexps.negative) !== -1) {
        weight -= 25; }

      if(e.className.search(readability.regexps.positive) !== -1) {
        weight += 25; }
    }

    /* Look for a special ID */
    if (typeof(e.id) === 'string' && e.id !== '') {
      if(e.id.search(readability.regexps.negative) !== -1)
        weight -= 25;

      if(e.id.search(readability.regexps.positive) !== -1)
        weight += 25;
    }
    return weight;
  },

  /**
   * Clean an element of all tags of type "tag" if they look fishy.
   * "Fishy" is an algorithm based on content length, classnames,
   * link density, number of images & embeds, etc.
   *
   * @return void
   **/
  cleanConditionally: function (e, tag) {

    if(!readability.flagIsActive(readability.FLAG_CLEAN_CONDITIONALLY)) {
      return;
    }

    var tagsList      = e.getElementsByTagName(tag);
    var curTagsLength = tagsList.length;

    /**
     * Gather counts for other typical elements embedded within.
     * Traverse backwards so we can remove nodes at the same time
     *  without effecting the traversal.
     *
     * TODO: Consider taking into account original contentScore here.
     **/
    for (var i=curTagsLength-1; i >= 0; i-=1) {
      var weight = readability.getClassWeight(tagsList[i]);
      var contentScore = (typeof tagsList[i].readability !== 'undefined') ?
        tagsList[i].readability.contentScore : 0;

      dbg("Cleaning Conditionally " + tagsList[i] +
          " (" + tagsList[i].className + ":" + tagsList[i].id + ")" +
          ((typeof tagsList[i].readability !== 'undefined') ?
              (" with score " + tagsList[i].readability.contentScore) : ''));

      if(weight+contentScore < 0)
      {
        tagsList[i].parentNode.removeChild(tagsList[i]);
      }
      else if ( readability.getCharCount(tagsList[i],',') < 10) {
        /**
         * If there are not very many commas, and the number of
         * non-paragraph elements is more than paragraphs or other
         *  ominous signs, remove the element.
         **/
        var p      = tagsList[i].getElementsByTagName("p").length;
        var img    = tagsList[i].getElementsByTagName("img").length;
        var li     = tagsList[i].getElementsByTagName("li").length-100;
        var input  = tagsList[i].getElementsByTagName("input").length;

        var embedCount = 0;
        var embeds     = tagsList[i].getElementsByTagName("embed");
        for(var ei=0,il=embeds.length; ei < il; ei+=1) {
          if (embeds[ei].src.search(readability.regexps.videos) === -1) {
            embedCount+=1;
          }
        }

        var linkDensity   = readability.getLinkDensity(tagsList[i]);
        var contentLength = tagsList[i].textContent.length;
        var toRemove      = false;

        if ( img > p ) {
          toRemove = true;
        } else if(li > p && tag !== "ul" && tag !== "ol") {
          toRemove = true;
        } else if( input > Math.floor(p/3) ) {
          toRemove = true;
        } else if(contentLength < 25 && (img === 0 || img > 2) ) {
          toRemove = true;
        } else if(weight < 25 && linkDensity > 0.2) {
          toRemove = true;
        } else if(weight >= 25 && linkDensity > 0.5) {
          toRemove = true;
        } else if((embedCount === 1 && contentLength < 75) || embedCount > 1) {
          toRemove = true;
        }

        if(toRemove) {
          tagsList[i].parentNode.removeChild(tagsList[i]);
        }
      }
    }
  },

  // Remove extraneous break tags from a node.
  killBreaks: function (e) {
    try {
      e.innerHTML = e.innerHTML
                    .replace(readability.regexps.killBreaks,'<br />');
    }
    catch (eBreaks) {
      dbg("KillBreaks failed - this is an IE bug. Ignoring.: " + eBreaks);
    }
  },

   // Clean a node of all elements of type "tag".
   // (Unless it's a youtube/vimeo video. People love movies.)
   clean: function (e, tag) {
       var targetList = e.getElementsByTagName( tag );
       var isEmbed    = (tag === 'object' || tag === 'embed');

       for (var y=targetList.length-1; y >= 0; y-=1) {
           /* Allow youtube and vimeo videos through as people usually want to see those. */
           if(isEmbed) {
               var attributeValues = "";
               for (var i=0, il=targetList[y].attributes.length; i < il; i+=1) {
                   attributeValues += targetList[y].attributes[i].value + '|';
               }

               /* First, check the elements attributes to see if any of
                *                 * them contain youtube or vimeo */
               if (attributeValues.search(readability.regexps.videos) !== -1) {
                   continue;
               }

               /* Then check the elements inside this element for the same. */
               if (targetList[y].innerHTML.search(readability.regexps.videos)
                !== -1) continue;
           }

           targetList[y].parentNode.removeChild(targetList[y]);
       }
   },

  /**
   * Clean out spurious headers from an Element. Checks things like classnames
   * and link density.
   *
   * @param Element
   * @return void
   **/
  cleanHeaders: function (e) {
    for (var headerIndex = 1; headerIndex < 3; headerIndex+=1) {
      var headers = e.getElementsByTagName('h' + headerIndex);
      for (var i=headers.length-1; i >=0; i-=1) {
        if (readability.getClassWeight(headers[i]) < 0 ||
            readability.getLinkDensity(headers[i]) > 0.33) {
          headers[i].parentNode.removeChild(headers[i]);
        }
      }
    }
  },

  flagIsActive: function(flag) {
    return (readability.flags & flag) > 0;
  },

  removeFlag: function(flag) {
    readability.flags = readability.flags & ~flag;
  }
};

module.exports = readability;
