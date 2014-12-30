// Constants
var BOARD_ID = 1;
var MOVE_ANIMATION_MS = 100;
var FLIP_ANIMATION_MS = 200;
var UPDATE_LOOP_MS = 500;

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

$(document).ready(function() {
$.ajax({url: "/show/boards/" + BOARD_ID, success: function(board) {
  // Get the user from the URL params, assumes only one parameter called u
  requestingUser = null;
  var pathParts = ($(document)[0].URL).split("?u=");
  if (pathParts.length == 2) {
    requestingUser = pathParts[1];
  }

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
    },

    stop: function(event, ui) {
      if (IsSelected(ui.helper)) {
        ui.helper.addClass("canDrag");
        SendBoardUpdate();
      }
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
    if (c == "t") {
      console.log("Taking");
      // TODO: Take card function
      // TODO: Call SendBoardUpdate inside Fxn
      SendBoardUpdate();
    } else if (c == "u") {
      console.log("Flip Up");
      FlipSelectedCards(true);
    } else if (c == "d") {
      console.log("Flip Down");
      FlipSelectedCards(false);
    } else if (c == "g") {
      GroupCards();
      console.log("Group");
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

  function GroupCards() {
    var lockKey = LockCards("grouping");
    var tops = GetSelected().map(function() {return $(this).offset().top}).get();
    var lefts = GetSelected().map(function() {return $(this).offset().left}).get();
    var baseTop = Math.floor(Array.avg(tops));
    var baseLeft = Math.floor(Array.avg(lefts));
    var offsetPerGroup = 2;
    var cardsPerGroup = 3;
    var doneStartingCardsMoving = false;
    // Sort by z-index
    var inOrder = GetSelected().toArray().sort(function(x,y) {return $(x).zIndex() - $(y).zIndex()});
    var cardsToMove = inOrder.length;
    for (var i = 0; i < inOrder.length; i++) {
      var groupIndex = Math.floor((i-1)/cardsPerGroup) + 1;
      var offset = groupIndex * offsetPerGroup;
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
      MoveCard(allCards[inOrder[i].id], baseTop + offset, baseLeft + offset, finishedMovingAllCards);
    }
  }

  function GetZIndices(elements) {
    return $(elements).map(function() {
      return $(this).zIndex();
    }).get();
  }

  /*
   * Bring the given elements to the foreground such that every item
   * in elements has a higher z-index than the highest z-index in others.
   * The relative offsets of z-index within elements will be preserved.
   */
  function BringToFront(elements, others) {
    if (elements == null || others == null || elements.length == 0 || others.length == 0) {
      return;
    }
    elements = $(elements).toArray(); // Preserve order by converting to array (if not already one)
    var origZIndices = GetZIndices(elements);
    var minOrig = Array.min(origZIndices);
    var origZOffsets = origZIndices.map(function(x) {return x - minOrig});

    var otherZIndices = GetZIndices($(others).not(elements));
    var maxOthers = Array.max(otherZIndices);

    for (var i = 0; i < elements.length; i++) {
      var zIndex = maxOthers + 1 + origZOffsets[i];
      UpdateZIndex(allCards[elements[i].id], zIndex);
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
        interval: 600, // number = milliseconds hover before trigging onMouseOver (ie polling interval)
        timeout: 100, // number = milliseconds after leaving before triggering onMouseOut
        over: function(event) { // function = onMouseOver callback (REQUIRED)
          ZoomCard(card, event);
        },
        out: function(event) { // function = onMouseOut callback (REQUIRED)
          UnzoomCard(card, event);
        }
    });
    card.handElement = $("<p></p>").text(card.hand);
    card.handElement.hide();
    if (IsInOthersHand(card)) {
      card.handElement.show();
    }
    if (IsInUsersHand(card)) {
      card.element.addClass("inHand");
    }
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

  /* Returns a random ID of the lock. Takes a lock type string to help in debugging.
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
    console.log("Sending board update:");
    console.log(GetCurrentBoard());
    $.post("/updateboard/" + BOARD_ID, GetCurrentBoard(), function() {console.log("Sending success");});
  }

  function FlipCard(card, frontUp) {
    // Prevent flipping if card flipping is in progress, and if the card is already in
    // the correct orientation.
    if (flipping[card.element.id] == true || frontUp == card.frontUp) {
      return;
    }
    // Prevent flipping of other people's cards
    if (IsInOthersHand(card)) {
      return;
    }
    flipping[card.element.id] = true;
    console.log('Flipping card to ' + frontUp);
    var img = card.imageElement;
    var newUrl = frontUp ? card.frontImage : card.backImage;
    var curWidth = parseInt(img.css("width"));
    var curHeight = parseInt(img.css("height"));
    var curLeft = parseInt(card.element.offset().left);
    img.animate({width: 0, height: curHeight}, FLIP_ANIMATION_MS/2, function() {
      img.attr("src", newUrl);
      img.animate({width: curWidth, height: curHeight}, FLIP_ANIMATION_MS/2);
    });
    card.element.animate({left: curLeft + Math.floor(curWidth/2)}, FLIP_ANIMATION_MS/2, function() {
      card.element.animate({left: curLeft}, FLIP_ANIMATION_MS/2);
    });
    setTimeout(function() {delete flipping[card.element.id]}, FLIP_ANIMATION_MS)
    card.frontUp = frontUp;
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

  function ZoomCard(card, event) {
    // Don't zoom in on cards that have their backs showing
    if (card.imageElement.attr("src") == card.backImage) {
      return;
    }
    var zoomId = card.element.attr("id") + "-zoom";
    if ($("#" + zoomId) == null) {
      console.log("here");
      return;
    }
    var clone = card.element.clone(false);
    clone.removeClass("ui-selectee ui-selected ui-selecting");
    clone.attr("id", zoomId);
    clone.addClass("zoomedCard");
    clone.appendTo(card.element.parent());
    clone.css("z-index", parseInt(card.element.css("z-index")) + 1);
    clone.offset({top: curMouseY + 5, left: curMouseX + 5,});
    clone.children("img").css({height: parseFloat(card.element.css("height")) * 2,
               width: parseFloat(card.element.css("width")) * 2});
  }

  function UnzoomCard(card, event) {
     $(".zoomedCard").remove();
  }

  function UpdateZIndex(card, newZIndex) {
    card.element.zIndex(newZIndex);
    card["z-index"] = newZIndex;
  }

  function UpdateBoard(boardFromServer) {
    console.log("Getting board update");
    var differences = util.Diff(GetCurrentBoard(), boardFromServer.cardInstances);
    if (differences == null) {
      console.log("No diffs");
      return;
    }
    for (var cardInstanceId in differences) {
      var domId = CardInstanceIdToDomId(cardInstanceId);
      var card = allCards[domId];
      var diff = differences[cardInstanceId];
      if (diff != null) {
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
      if (diff.top != null || diff.left != null) {
        MoveCard(card, diff.top, diff.left);
      }
      if (diff.zIndex != null) {
        UpdateZIndex(card, diff.zIndex);
      }
      if (diff.frontUp != null) {
        FlipCard(card, diff.frontUp);
      }
    } 
  }

  function GetCurrentBoard() {
    var data = {}
    for (var domId in allCards) {
      var card = allCards[domId];
      data[card.cardInstanceId] = {
        frontUp: card.frontUp,
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
    console.log("Requesting latest");
    $.ajax({url: "/show/boards/" + BOARD_ID, success: function(board) {
      console.log("Got latest, updating");
      UpdateBoard(board);
    }});
    setTimeout(function(){UpdateBoardLoop();}, UPDATE_LOOP_MS);
  }
  UpdateBoardLoop();
}});
});

