// Constants
var BOARD_ID = 1;
var MOVE_ANIMATION_MS = 100;
var FLIP_ANIMATION_MS = 200;
var UPDATE_LOOP_MS = 500;
var HOVER_ENTER_DELAY = 600;
var HOVER_LEAVE_DELAY = 100;
var FAN_OFFSET = 20;

// Global vars
var cardLock = {}
var shiftPressed = false;
var selectableContainer = null;
// To keep track of items at the start of a shift-lasso so we can de-select
// items en masse, and add new items to the selection en masse
var selectedAtShiftLassoStart;
var allCards = {};
var curMouseX = 0;
var curMouseY = 0;
var flipping = {};
var requestingUser = null;
var isMousingOverCard = {}; // Which face-up cards are being moused over (card.id => true)
var isMouseDown = false;

$(document).ready(function() {
$.ajax({url: "/show/boards/" + BOARD_ID, success: function(board) {
  // Get the user from the URL params, assumes only one parameter called u
  requestingUser = null;
  var pathParts = ($(document)[0].URL).split("?u=");
  if (pathParts.length == 2) {
    requestingUser = pathParts[1];
  }
  if (requestingUser == null) {
    $("body").text("Please specify a user with ?u=USERNAME");
    return;
  }

  // Keep track of when the mouse is down
  $("body").mousedown(function(event) {isMouseDown = true;});
  $("body").mouseup(function(event) {isMouseDown = false;});
  $("body").mouseleave(function(event) {isMouseDown = false;});

  selectableContainer = $(".selectable-container");

  // Initialize DOM
  // cardInstanceId: Which card on the board.  Distinct from the ID of the card itself...
  // Maybe the ID for the card itself should be card UID
  for (var cardInstanceId in board.cardInstances) {
    var domId = CardInstanceIdToDomId(cardInstanceId);
    var card = board.cardInstances[cardInstanceId]
    var clientCard = CreateCard({
      id: domId,
      cardInstanceId: cardInstanceId,
      top: card.top,
      left: card.left,
      "z-index": card.zIndex,
      backImage: card.card.backImage,
      frontImage: card.card.frontImage,
      frontUp: card.frontUp,
      hand: card.hand,
      user: requestingUser,
    });
    selectableContainer.append(clientCard.element);
    clientCard.element.parent().mousemove(function(event) {
      curMouseX = event.pageX;
      curMouseY = event.pageY;
      $(".zoomedCard").offset({left: curMouseX + 5, top: curMouseY + 5}) ;
    });

    allCards[domId] = clientCard;
  }
  var draggable = $(".draggable");

  // Initialize handlers etc
  selectableContainer.selectable({
    start: function(event, ui) {
      // Keep track of what was currently selected when a shift-lasso drag started
      if (shiftPressed) {
        selectedAtShiftLassoStart = GetSelected();
      }
    },

    selecting: function(event, ui) {
      // Invert logic for shift-drag select
      if ($(selectedAtShiftLassoStart).is(ui.selecting)) {
        $(ui.selecting).removeClass("ui-selected");
        $(ui.selecting).removeClass("ui-selecting");
        $(ui.selecting).removeClass("canDrag");
        return;
      }
    },

    selected: function(event, ui) {
      // Invert logic for shift-drag select
      if ($(selectedAtShiftLassoStart).is(ui.selected)) {
        $(ui.selected).removeClass("ui-selected");
        $(ui.selected).removeClass("canDrag");
        return;
      }
      $(ui.selected).addClass("canDrag");
    },

    unselecting: function(event, ui) {
      // Retain selected items during shift drag
      if ($(selectedAtShiftLassoStart).is(ui.unselecting)) {
        $(ui.unselecting).addClass("ui-selected");
        return;
      }
    },

    unselected: function(event, ui) {
      $(ui.unselected).removeClass("canDrag");
    },

    stop: function(event, ui) {
      // Lasso is over, what was selected at start is now irrelevant
      selectedAtShiftLassoStart = null;
    },

    // Only allow top-level items inside the selectable container to be selected
    filter: "> *"
  });

  var startGrabTop;
  var startGrabLeft;
  var currentPositions;

  draggable.draggable({
    cursor: "-webkit-grabbing",

    start: function(event, ui) {
      cardLock.drag = true;

      // If an item is not selected yet a drag event starts on it,
      // pretend it was clicked prior to dragging
      if (!IsSelected(ui.helper)) {
        ui.helper.trigger("click");
      }
      var selected = GetSelected();
      startGrabTop = ui.position.top
      startGrabLeft = ui.position.left
      currentPositions = selected.not(ui.helper).map(function() {
        return $(this).offset();
      }).get();

      // When we drag things, they should float above others
      BringToFront(selected, GetSelectees().not(selected));
    },

    drag: function(event, ui) {
      /* Drag only if selected */
      if (!IsSelected(ui.helper)) {
        event.preventDefault();
        return;
      }
      ui.helper.removeClass("canDrag");
      topMoved = ui.position.top - startGrabTop;
      leftMoved = ui.position.left - startGrabLeft;

      GetSelected().not(ui.helper).each(function(index, element) {
        element.style.top = currentPositions[index].top + topMoved;
        element.style.left = currentPositions[index].left + leftMoved;
      });

      // Check whether a card is hovering over the playable area
      var someOverlapping = false;
      var otherHandCards = GetHandCards(requestingUser, true);
      GetSelected().not(otherHandCards).each(function(index, cardElement) {
        var isInPlayableArea = $(cardElement).overlaps($("#playable-area")).hits.length > 0;
        if (isInPlayableArea) {
          someOverlapping = true;
          $(cardElement).removeClass("inHand");
        } else {
          $(cardElement).addClass("inHand");
        }
      });
      if (someOverlapping) {
        $("#playable-area").addClass("cardOverPlayable");
      } else {
        $("#playable-area").removeClass("cardOverPlayable");
      }
    },

    stop: function(event, ui) {
      var cardElement = ui.helper;

      UpdateCardsInPlay(GetSelected().add(cardElement));

      // Restore the ability to drag the element
      cardElement.addClass("canDrag");
      Deselect();
      $("#playable-area").removeClass("cardOverPlayable");

      SendBoardUpdate();
      delete cardLock.drag;
    },
  });

  /*
   * Since draggable conflicts with the click-to-select behavior of selectable,
   * we must manually define how clicks select items.
   */
  $(".ui-selectee").click(function() {
    var alreadySelected = GetSelected().is(this);
    if (alreadySelected) {
      if (shiftPressed) {
        // Selected already, remove from existing list of selected things
        SelectSelectableElement(selectableContainer, GetSelected().not($(this)));
      } else {
        // Selected already, no shift pressed, select only this one
        SelectSelectableElement(selectableContainer, $(this));
      }
    } else {
      if (shiftPressed) {
        // Not selected, add to existing list of selected things
        SelectSelectableElement(selectableContainer, GetSelected().add($(this)));
      } else {
        // Not selected, no shift pressed, select only this one
        SelectSelectableElement(selectableContainer, $(this));
      }
    }
  });


  $(document).keypress(function(e) {
    var c = String.fromCharCode(e.which);
    var validKey = true;
    if (c == "u") {
      console.log("Flip Up");
      FlipSelectedCards(true);
    } else if (c == "d") {
      console.log("Flip Down");
      FlipSelectedCards(false);
    } else if (c == "g") {
      GroupCards();
      console.log("Group");
    } else if (c == "f") {
      FanCards(GetHandCards(requestingUser));
      console.log("Fan");
    } else {
      validKey = false;
    }
    if (validKey) {
      var fakeMouseup = $.Event( "mouseup", { which: 1 } );
      draggable.trigger(fakeMouseup);
    }
  });

  $(document).on('keyup keydown', function(e) {shiftPressed = e.shiftKey});

  /** Container is a .selectable container, elementsToSelect should be in it */
  function SelectSelectableElement(container, elementsToSelect)
  {
    // add unselecting class to all elements in the styleboard canvas except the ones to select
    $(".ui-selected", container).not(elementsToSelect).removeClass("ui-selected").addClass("ui-unselecting");
    
    // add ui-selecting class to the elements to select
    $(elementsToSelect).not(".ui-selected").addClass("ui-selecting");

    // trigger the mouse stop event (this will select all .ui-selecting elements, and deselect all .ui-unselecting elements)
    container.data("ui-selectable")._mouseStop(null);
  }

  function GetDraggableElementId(element) {
    return element.id.split("-")[1];
  }

  function GetSelected(container) {
    if (container == null) {
      container = selectableContainer
    }
    return $(".ui-selected", container);
  }

  function GetSelecting(container) {
    if (container == null) {
      container = selectableContainer
    }
    return $(".ui-selecting", container);
  }

  function GetSelectees(container) {
    if (container == null) {
      container = selectableContainer
    }
    return $(".ui-selectee", container);
  }

  /** Deselect the given jquery elements, if none specified, deselects all selected */
  function Deselect(elements) {
    if (elements == null) {
      elements = GetSelected();
    } 
    GetSelected().filter(elements).removeClass("ui-selected");
    GetSelected().filter(elements).removeClass("ui-selecting");
  }

  function IsSelected(element) {
    return $(element).hasClass("ui-selected");
  }

  function IsSelecting(element) {
    return $(element).hasClass("ui-selecting");
  }

  function IsCardSelectLocked(card) {
    if (IsSelected(card.element) || IsSelecting(card.element)) {
      for (var key in cardLock) {
        if (cardLock[key] == true) {
          return true;
        }
      }
    }
    return false;
  }

  function IsFrontShowing(card) {
    return card.imageElement.attr("src") == card.frontImage;
  }

  function IsZooming() {
    return $(".zoomedCard").length > 0;
  }

  function GroupCards() {
    var lockKey = LockCards("grouping");
    var selected = GetSelected();
    var origPos = selected.toArray().map(function(jqCard) {
      var c = $(jqCard);
      return {top: c.offset().top, left: c.offset().left, zIndex: c.zIndex()};
    });
    var offsetPerGroup = 2;
    var cardsPerGroup = 8;

    var newPos = util.GroupCardPositions(origPos, offsetPerGroup, cardsPerGroup);
    var cardsToMove = newPos.length;
    for (var i = 0; i < newPos.length; i++) {
      function finishedMovingAllCards() {
        cardsToMove--;
        if (cardsToMove <= 0) {
          UnlockCards(lockKey);
          SendBoardUpdate();
        }
      }
      // Note: cards have a move animation time, so we need to wait for the
      // last card to be moved before we can unlock the cards and send the
      // board update, thus we use a callback.
      MoveCard(allCards[selected[i].id], newPos[i].top, newPos[i].left, finishedMovingAllCards);
    }
  }

  /**
   * Returns jquery collection of hand card elements.  If specified user is null,
   * assumes the requesting user.  If negating, then returns cards of hand other
   * than the specified user
   */
  function GetHandCards(user, negate) {
    if (user == null) {
      user = requestingUser
    }
    handCards = $();
    for (var key in allCards) {
      if ((negate && allCards[key].hand != null && allCards[key].hand !== user) ||
           !negate && allCards[key].hand === user ) {
        handCards = handCards.add(allCards[key].element);
      }
    }
    return handCards;
  }

  /**
   * Returns the left or top coordinates of the elements in the jquery collection.
   * leftOrTop should be "left" or "top."  If agg is specified as "avg", "min" or "max"
   * then the average, min, or max of these values will be returned.
   */
  function GetOffsets(collection, leftOrTop, agg) {
    var ret = collection.map(function() {return $(this).offset()[leftOrTop]}).get();
    if (agg != null) {
      return Array[agg](ret);
    } else {
      return ret;
    }
  }

  /**
   * Return the element with the highest or lowest value of a given property.
   *
   * collection: jquery collection of elements
   * getter: a function that retrieves a value from a jquery element
   * doMin: true if the minimum value is requested, otherwise the maximum value
   */
  function GetXMost(collection, getter, isMin) {
    var minElement, maxElement, minVal, maxVal;
    for (var i = 0; i < collection.length; i++) {
      var ele = collection[i];
      var val = getter(ele);
      if (i == 0 || val < minVal) {
        minElement = ele;
        minVal = val;
      }
      if (i == 0 || val > maxVal) {
        maxElement = ele;
        maxVal = val;
      }
    }
    return isMin ? minElement : maxElement;
  }

  /** Returns array */
  function SortByLeft(collection) {
    return collection.toArray().sort(function(x,y) {return $(x).offset().left - $(y).offset().left});
  }

  /** Returns the card object associated with the jquery element of the card */
  function GetCard(element) {
    // Sometimes jquery objects are array-like
    if (element != null && element[0] != null) {
      element = element[0];
    }
    return allCards[element.id];
  }

  /**
   * cards: a jquery cards collection.
   * anchor: null if the fanning should occur at the leftmost element in cards,
   *         otherwise it occurs starting just to the right of the given anchor element.
   */
  function FanCards(cards, anchor) {
    var lockKey = LockCards("fanning");
    var cards = SortByLeft(cards);
    if (anchor == null) {
      var baseLeft = $(cards[0]).offset().left;
      var baseTop = $(cards[0]).offset().top;
    } else {
      var baseLeft = anchor.offset().left + FAN_OFFSET;
      var baseTop = anchor.offset().top;
    }

    var cardsToMove = cards.length;
    for (var i = 0; i < cards.length; i++) {
      // We want to send an update after all cards have moved
      function finishedMovingAllCards() {
        cardsToMove--;
        if (cardsToMove <= 0) {
          UnlockCards(lockKey);
          SendBoardUpdate();
        }
      }
      // Note: cards have a move animation time, so we need to wait for the
      // last card to be moved before we can unlock the cards and send the
      // board update, thus we use a callback.
      var card = GetCard(cards[i]);
      // Set z-index to a relative value, it will be changed to the correct absolute-value
      // when we move all these cards to the top
      UpdateZIndex(card, i);
      MoveCard(card, baseTop, baseLeft + FAN_OFFSET * i, finishedMovingAllCards);
    }
    BringToFront(cards, $(".card"));
  }

  function UpdateCardHand(card, newHand) {
    if (card == null) {
      return;
    }
    card.hand = newHand;

    if (!IsInAHand(card)) {
      card.handElement.hide();
      card.element.removeClass("inHand");
    } else if (IsInUsersHand(card)) {
      card.handElement.hide();
      card.element.addClass("inHand");
    } else if (IsInOthersHand(card)) {
      card.handElement.show();
      card.element.removeClass("inHand");
    }

    // Flip the card if necessary
    if (IsFrontShowing(card) != card.frontUp) {
      FlipCard(card, card.frontUp);
    }
  }


  function UpdateCardsInPlay(cardElements) {
    if (cardElements == null) {
      cardElements = $(".card");
    }
    // If was in a hand, and now is in playable area, then mark as in play
    // and remove it from the hand. And vice versa:
    cardElements.each(function(index, cardElement) {
      var card = GetCard(cardElement);
      var isInPlayableArea = $(cardElement).overlaps($("#playable-area")).hits.length > 0;
      if (IsInUsersHand(card) && isInPlayableArea && card.hand === requestingUser) {
        UpdateCardHand(card, null);
      } else if (!IsInAHand(card) && !isInPlayableArea && card.hand == null) {
        UpdateCardHand(card, requestingUser);
      }
    });
  }

  function GetZIndices(elements) {
    return $(elements).map(function() {
      return $(this).zIndex();
    }).get();
  }

  /*
   * Bring the given card elements to the foreground such that every item
   * in elements has a higher z-index than the highest z-index in otherElements.
   * The relative offsets of z-index within elements will be preserved.
   */
  function BringToFront(cardElements, otherElements) {
    if (cardElements == null || otherElements == null
        || cardElements.length == 0 || otherElements.length == 0) {
      return;
    }
    // Preserve order by converting to array (if not already one)
    cardElements = $(cardElements).toArray();
    var origZIndices = GetZIndices(cardElements);
    var minOrig = Array.min(origZIndices);
    var origZOffsets = origZIndices.map(function(x) {return x - minOrig});

    var otherZIndices = GetZIndices($(otherElements).not(cardElements));
    var maxOthers = Array.max(otherZIndices);

    for (var i = 0; i < cardElements.length; i++) {
      var zIndex = maxOthers + 1 + origZOffsets[i];
      UpdateZIndex(GetCard(cardElements[i]), zIndex);
    }
  }

  function CreateCard(values) {
    var card = {}

    var attrKeys = ["id"];
    var cssKeys = ["z-index", "top", "left"];
    var otherKeys = ["frontImage", "backImage", "frontUp", "cardInstanceId", "hand"];

    var attrMap = {}
    var cssMap = {}
    var otherMap = {}

    attrKeys.forEach(function(key) {
      card[key] = values[key];
      attrMap[key] = values[key];
    });
    cssKeys.forEach(function(key) {
      card[key] = values[key];
      cssMap[key] = values[key];
    });

    otherKeys.forEach(function(key) {
      card[key] = values[key];
      otherMap[key] = values[key];
    });

    var imageUrl;
    // The front of cards not in a hand is visible to everyone.
    // The front of cards in a hand is only visible to their owner.
    if (card.frontUp && !IsInOthersHand(card)) {
      imageUrl = card.frontImage;
    } else {
      imageUrl = card.backImage
    }

    cssMap["position"] = "absolute";
    card.element = $("<div></div>")
        .attr(attrMap)
        .css(cssMap)
        .addClass("draggable card");
    card.imageElement = $("<img src='" + imageUrl + "'/>");
    card.imageElement.appendTo(card.element);
    card.imageElement.hoverIntent({
        sensitivity: 3, // number = sensitivity threshold (must be 1 or higher)
        interval: HOVER_ENTER_DELAY, // number = milliseconds hover before trigging onMouseOver (ie polling interval)
        timeout: HOVER_LEAVE_DELAY, // number = milliseconds after leaving before triggering onMouseOut
        over: function() { // function = onMouseOver callback (REQUIRED)
          if (!isMouseDown) {
            ZoomCard(card);
          }
        },
        out: function() { // function = onMouseOut callback (REQUIRED)
          if (Object.keys(isMousingOverCard).length == 0) {
            UnzoomCard(card);
          }
        }
    });

    // If already zooming in, the next face-up card should instantly zoom
    card.imageElement.mouseenter(function() {
      isMousingOverCard[card.id] = true;
      if (IsZooming() && !isMouseDown) {
        ZoomCard(card);
      }
    });
    // Stop zooming when we have zoomed via mouseenter (instead of hover).
    card.imageElement.mouseleave(function() {
      delete isMousingOverCard[card.id];
      setTimeout(function() {
        if (Object.keys(isMousingOverCard).length == 0) {
          UnzoomCard(card);
        }
      }, HOVER_LEAVE_DELAY);
    });
    card.handElement = $("<p></p>").text(card.hand);
    UpdateCardHand(card, card.hand);
    card.handElement.appendTo(card.element);

    card.element.mousedown(function(event) { UnzoomCard($(this), event); });
    return card;
  }

  function FlipSelectedCards(frontUp) {
    // Note: while there is an animation effect, the state will be updated
    // immediately at the end of this function, so it's safe to unlock.
    var lockKey = LockCards("flip");
    GetSelected().each(function(index, element) {
      var card = allCards[element.id];
      if (card != null) {
        FlipCard(card, frontUp);
      }
    });
    UnlockCards(lockKey);
    SendBoardUpdate();
  }

  function IsInAHand(card) {
    return card.hand != null;
  }

  function IsInUsersHand(card) {
    return card.hand == requestingUser
  }

  function IsInOthersHand(card) {
    return IsInAHand(card) && !IsInUsersHand(card);
  }

  /* 
   * For some actions where there is a slow animation or chance of a race condition,
   * we must lock the cards so the user doesn't queue up too many actions (or so
   * there isn't an unpredictable outcome).
   *
   * Returns a random ID of the lock. Takes a lock type string to help in debugging.
   * Use only when you are locking/unlocking in the same function, otherwise, just
   * access the lock directly.
   */
  function LockCards(lockType) {
    var randomInt = Math.floor(Math.random() * (1000000000));
    var key = String(lockType) + randomInt;
    cardLock[key] = true;
    return key;
  }

  // Takes the return value of LockCards
  function UnlockCards(lockKey) {
    if (cardLock[lockKey] != null) {
      delete cardLock[lockKey];
    }
  }

  function SendBoardUpdate() {
    var debug = false;
    if (debug) {
      console.log("Sending board update:");
        console.log(GetCurrentBoard());
      }
    $.post("/updateboard/" + BOARD_ID, GetCurrentBoard(), function() {
        if (debug) { console.log("Sending success"); };
    });
  }

  function FlipCard(card, newFrontUp) {
    // Prevent flipping if card flipping is in progress, and if the card is already in
    // the correct orientation.
    if (flipping[card.id] == true || newFrontUp == IsFrontShowing(card)) {
      return;
    }
    if (IsInOthersHand(card)) {
      return; // Prevent flipping of other people's cards
    }

    flipping[card.id] = true;
    var img = card.imageElement;
    var newUrl = newFrontUp ? card.frontImage : card.backImage;
    var curWidth = parseInt(img.css("width"));
    var curHeight = parseInt(img.css("height"));
    var curLeft = parseInt(card.element.offset().left);

    // Changes image and its width to make it looks like it's flipping over
    var imageAnim = new AnimationSequence();
    imageAnim.addAnimation(img, {width: 0, height: curHeight}, FLIP_ANIMATION_MS/2);
    imageAnim.addCallback(function() {img.attr("src", newUrl)});
    imageAnim.addAnimation(img, {width: curWidth, height: curHeight}, FLIP_ANIMATION_MS/2);

    // Shifts horizontal position the element wrapping the image to make it
    // flip over in place.
    var elemAnim = new AnimationSequence();
    elemAnim.addAnimation(card.element, {left: curLeft + Math.floor(curWidth/2)}, FLIP_ANIMATION_MS/2);
    elemAnim.addAnimation(card.element, {left: curLeft}, FLIP_ANIMATION_MS/2);
    elemAnim.addCallback(function() {delete flipping[card.id]});
    card.frontUp = newFrontUp;

    imageAnim.start();
    elemAnim.start();
  }

  // If either newTop or newLeft is null, does not animate in that dimension
  // Callback gets called when the move animation is complete
  function MoveCard(card, newTop, newLeft, callback) {
    if (newTop != null && newLeft != null) {
      var newOffset = {};
      if (newTop != null) { newOffset.top = newTop; }
      if (newLeft != null) { newOffset.left = newLeft; }
      var opts = {duration: MOVE_ANIMATION_MS};
      if (callback != null) {
        opts.complete = callback;
      }
      card.element.animate(newOffset, opts);
    }
  }

  function ZoomCard(card) {
    UnzoomCard(card);
    var zoomId = card.element.attr("id") + "-zoom";
    var clone = card.element.clone(false);
    clone.removeClass("ui-selectee ui-selected ui-selecting");
    clone.attr("id", zoomId);
    clone.addClass("zoomedCard");
    clone.appendTo(card.element.parent());
    clone.css("z-index", parseInt(card.element.css("z-index")) + 1);
    clone.offset({top: curMouseY + 5, left: curMouseX + 5,});
    clone.children("img").css({height: parseFloat(card.element.css("height")) * 2,
               width: parseFloat(card.element.css("width")) * 2});
    var maxCardZIndex = Array.max(GetZIndices($(".card")));
    clone.zIndex(maxCardZIndex + 1);
  }

  function UnzoomCard(card) {
     $(".zoomedCard").remove();
  }

  function UpdateZIndex(cardObject, newZIndex) {
    cardObject.element.zIndex(newZIndex);
    cardObject["z-index"] = newZIndex;
  }

  function UpdateBoard(boardFromServer) {
    // console.log("Getting board update");
    var differences = util.Diff(GetCurrentBoard(), boardFromServer.cardInstances);
    if (differences === undefined) {
      // console.log("No diffs");
      return;
    }
    for (var cardInstanceId in differences) {
      var domId = CardInstanceIdToDomId(cardInstanceId);
      var card = allCards[domId];
      var diff = differences[cardInstanceId];
      if (diff !== undefined) {
        console.log("Diff:");
        console.log(diff);
      }
     
      // If this user is dragging or otherwise interacting this card, we won't
      // move or modify it.  Note: this means it will appear as if this user
      // overrode changes already made (eg if it's a long drag... it cause a
      // very delayed override of the changes)
      if (IsCardSelectLocked(card)) {
        console.log("Skipping update because card is locked");
        continue;
      }
      if (diff.top !== undefined || diff.left !== undefined) {
        MoveCard(card, diff.top, diff.left);
      }
      if (diff.zIndex !== undefined) {
        UpdateZIndex(card, diff.zIndex);
      }
      if (diff.frontUp !== undefined) {
        FlipCard(card, diff.frontUp);
      }
      if (diff.hand !== undefined) {
        UpdateCardHand(card, diff.hand);
      }
    } 
  }

  function GetCurrentBoard() {
    var data = {}
    for (var domId in allCards) {
      var card = allCards[domId];
      data[card.cardInstanceId] = {
        frontUp: card.frontUp,
        hand: card.hand,
        top: card.element.offset().top,
        left: card.element.offset().left,
        zIndex: card["z-index"],
      }
    }
    return data;
  }

  function CardInstanceIdToDomId(cardInstanceId) {
    return "cardInstance" + cardInstanceId;
  }

  function UpdateBoardLoop() {
    // console.log("Requesting latest");
    $.ajax({url: "/show/boards/" + BOARD_ID, success: function(board) {
      // console.log("Got latest, updating");
      UpdateBoard(board);
    }});
    setTimeout(function(){UpdateBoardLoop();}, UPDATE_LOOP_MS);
  }
  // UpdateBoardLoop();
}});
});

