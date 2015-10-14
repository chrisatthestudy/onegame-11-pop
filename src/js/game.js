/*
 * =============================================================================
 * Pop!
 * =============================================================================
 * November game for One Game A Month
 *
 * (c) 2013 chrisatthestudy
 * -----------------------------------------------------------------------------
 * See the end of this file for the main entry point
 */

var gTotalScore = 0;
var gHighScore  = 0;

function supportsLocalStorage( ) { 
    try { 
        return 'localStorage' in window && window [ 'localStorage' ] !== null; 
    } catch( e ) { 
        return false; 
    } 
}
function saveState( key, value ) { 
    if( ! supportsLocalStorage( )) { return false; } 
    localStorage [ key ] = value; 
}
function readState( key ) { 
    if( ! supportsLocalStorage( )) { return false; } 
    return localStorage [ key ];    
}

/*
 * =============================================================================
 * DebugConsole() - simple console display
 * =============================================================================
 */
//{{{
var DebugConsole = function (options) {
    'use strict';

    var self = {
        
        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Initialises the object. This is called automatically when the object
        // is created.
        //{{{
        setup: function (options) {
            this.visible = true;
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the internal state of the console. This must be called from
        // the update() function of the current game state.
        //{{{
        update: function () {
        },
        //}}}

        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Renders the console on screen. This must be called from the draw()
        // function of the current game state.
        //{{{        
        draw: function () {
            if (this.visible) {
                // Draw the console background as a semi-transparent rectangle
                // at the top of the screen
                jaws.context.font      = "16px sans-serif";
                jaws.context.fillStyle = "rgba(128, 128, 128, 0.5";
                jaws.context.textAlign = "left";
                jaws.context.fillRect(0, 0, jaws.width, 64);
                jaws.context.fillStyle = "#ffffff";
                jaws.context.fillText("Mouse: " + jaws.mouse_x + ", " + jaws.mouse_y, 8, 16);
                jaws.context.fillText("Ticks: " + jaws.game_loop.ticks, 8, 32);
                jaws.context.fillText("FPS: " + jaws.game_loop.fps, 8, 48);
            }
        }
        //}}}
    };

    // Initialise the object and return it.    
    self.setup(options);
    return self;
};
//}}}

/*
 * =============================================================================
 * Countdown() - handles Timer countdowns
 * =============================================================================
 * This is a private class used internally by the Timer object (see below), and
 * holds details of a single countdown
 */
//{{{
var Countdown = function (duration) {
    'use strict';
    
    var self = {
        duration: duration,
        active: true,
        expired: false,
        last_tick: jaws.game_loop.current_tick,
        
        // ---------------------------------------------------------------------
        // reset(duration)
        // ---------------------------------------------------------------------
        reset: function (duration) {
            this.duration = duration;
            this.active = true;
            this.expired = false;
            this.last_tick = jaws.game_loop.current_tick;
        },
        
        // -----------------------------------------------------------------------------
        // update()
        // -----------------------------------------------------------------------------
        update: function (tick) {
            if ((!this.expired) && (Math.floor((tick - this.last_tick) / 100) >= 1)) {
                this.last_tick = tick;
                this.duration -= 1;
                if (this.duration <= 0) {
                    this.expired = true;
                }
            }
        },
        
        // -----------------------------------------------------------------------------
        // remove()
        // -----------------------------------------------------------------------------
        remove: function () {
            this.active = false;
        }
    };
    
    return self;
    
};
//}}}

/*
 * =============================================================================
 * Timer() - game timer, stopwatch, and countdown handler
 * =============================================================================
 * Keeps track of the duration of the game and provides countdown and counter
 * facilities.
 *
 * This class has to be slightly tricky because it needs to accommodate the game
 * pausing (when the browser tab loses focus, for example) and to continue the
 * timing correctly when it is unpaused.
 *
 * It also provides a 'counter' facility. Start it using 'startCounter', and
 * then check the 'counter' property to find out how long it has been since the
 * counter was started.
 */
//{{{ 
var Timer = function () {
    'use strict';
    
    var self = {

        // Number of seconds since the Timer was created or last reset        
        seconds: 1,
        
        // Collection of active countdowns
        countdowns: [],
        
        // Keep a record of the last game tick so that we can track the time
        last_tick: jaws.game_loop.current_tick,
            
        // ---------------------------------------------------------------------
        // reset()
        // ---------------------------------------------------------------------
        reset: function () {
            'use strict';
            // Set the timer to 1 second (starting from 0 seems to cause issues if
            // you attempt to use mod (%) on the seconds)
            this.seconds = 1;
            this.last_tick = jaws.game_loop.current_tick;
        },
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        update: function () {

            var tick = jaws.game_loop.current_tick;
            // Check the difference between the last tick and the current tick. If
            // amounts to 1 second or more, assume that 1 second has passed. This
            // means that if multiple seconds have passed (because the game has been
            // paused), it will still only count as a single second. This is not
            // exactly accurate, but works well enough for the game.
            this.countdowns.forEach(function (item, total) { item.update(tick); });
            if (Math.floor((tick - this.last_tick) / 1000) >= 1) {
                this.last_tick = tick;
                this.seconds += 1;
                if (this.counter >= 0) {
                    if (Math.floor((tick - this.last_counter_tick) / 1000) >= 1) {
                        this.last_counter_tick = tick;
                        this.counter += 1;
                    }
                }
            }
            this.countdowns = this.countdowns.filter(function (item) { return (item.active); });
        },
        
        // ---------------------------------------------------------------------
        // startCountdown()
        // ---------------------------------------------------------------------
        // Creates and returns a new Countdown.
        startCountdown: function (duration) {

            var countdown = Countdown(duration);
            this.countdowns.push(countdown);
            return countdown;
        },
        
        // Starts a counter, taking the current second as 0 and counting up each
        // second.
        startCounter: function () {
            this.counter = 0;
            this.last_counter_tick = jaws.game_loop.current_tick;
        },
        
        // Stops the counter.
        stopCounter: function () {
            this.counter = -1;
        },
        
        // Returns True if the counter is active.
        isActive: function () {
            return (this.counter != -1);
        }
    };

    self.reset();    
    return self;
    
};
//}}}

/*
 * =============================================================================
 * MouseDetector()
 * =============================================================================
 * Provides pixel-perfect checking for the sprites
 */
//{{{
var MouseDetector = function( options ) {
    
    var self = {
        setup: function( options ) {
            this.sprite = new jaws.Sprite( options );
            
            var canvas = document.createElement("canvas");
            img = this.sprite.image;
            canvas.width = img.width;
            canvas.height = img.height;
        
            // Copy the image contents to the canvas
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
        
            this.imageData = ctx.getImageData(0, 0, img.width, img.height);
        },
        
        get_alpha: function(sprite, x, y) {
            x = Math.floor(x - sprite.x);
            y = Math.floor(y - sprite.y);
            var index = (x + y * this.imageData.width) * 4;
            return this.imageData.data[index+3];
        },
        
        on_click: function(sprite, x, y) {
            if (sprite.rect().collidePoint(x, y)) {
                if (this.get_alpha(sprite, x, y) === 0) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        }
    }
    
    self.setup( options );
    return self;

}
//}}}

/*
 * =============================================================================
 * Detectors() - collection of MouseDetector instances
 * =============================================================================
 */
//{{{
var Detectors = function() {
    'use strict';
    
    var self = {
        setup: function() {
            this.RED_detector = MouseDetector( { image: "graphics/balloon_red.png" } );
            this.LEMON_detector = MouseDetector( { image: "graphics/balloon_lemon.png" } );
            this.GRAPE_detector = MouseDetector( { image: "graphics/balloon_grapes.png" } );
            this.STRAWBERRY_detector = MouseDetector( { image: "graphics/balloon_strawberry.png" } );
            this.BLUEBERRY_detector = MouseDetector( { image: "graphics/balloon_blueberry.png" } );
        },
        detectorFor: function(balloon_type) {
            if ((balloon_type == BalloonType.RED) || (balloon_type == BalloonType.YELLOW) || (balloon_type == BalloonType.PURPLE)) {
                return this.RED_detector;
            } else if (balloon_type == BalloonType.LEMON) {
                return this.LEMON_detector;
            } else if (balloon_type == BalloonType.GRAPE) {
                return this.GRAPE_detector;
            } else if (balloon_type == BalloonType.STRAWBERRY) {
                return this.STRAWBERRY_detector;
            } else if (balloon_type == BalloonType.BLUEBERRY) {
                return this.BLUEBERRY_detector;
            } else {
                return null;
            };
        }
    }
    
    self.setup();
    return self;
    
};
//}}}

/*
 * =============================================================================
 * BalloonType() - simple object to hold balloon type information
 * =============================================================================
 */
//{{{
var BalloonType = {
    RED: { 
        image: "graphics/balloon_red.png", 
        name: "RED balloons",
    },
    YELLOW: { 
        image: "graphics/balloon_yellow.png", 
        name: "YELLOW balloons", 
    },
    PURPLE: { 
        image: "graphics/balloon_purple.png",
        name: "PURPLE balloons",
    },
    GRAPE: { 
        image: "graphics/balloon_grapes.png", 
        name: "GRAPES",
    },
    LEMON: { 
        image: "graphics/balloon_lemon.png", 
        name: "LEMONS",
    },
    STRAWBERRY: { 
        image: "graphics/balloon_strawberry.png", 
        name: "STRAWBERRIES", 
    },
    BLUEBERRY: { 
        image: "graphics/balloon_blueberry.png", 
        name: "BLUEBERRIES", 
    },
    random: function (count) {
        var types = [this.RED, this.YELLOW, this.PURPLE, this.GRAPE, this.LEMON, this.STRAWBERRY, this.BLUEBERRY];
        if ((count == null) || (count > types.length)) {
            count = types.length;
        }
        var choice = Math.floor(Math.random() * count);
        return types[choice];
    },
    atIndex: function (index) {
        var types = [this.RED, this.YELLOW, this.PURPLE, this.GRAPE, this.LEMON, this.STRAWBERRY, this.BLUEBERRY];
        if (index > types.length - 1) {
            index = types.length - 1;
        }
        return types[index];
    }
};
//}}}

var RoundState = {
    WAITING: 0,
    ACTIVE: 1,
    FINISHED: 2,
    GAME_OVER: 3
};

var BalloonState = {
    NORMAL: 0,
    POPPING: 1,
    POPPED: 2
};

var is_popped = function (balloon) {
    return balloon.is_popped;
}

/*
 * =============================================================================
 * Intro() - Intro state handler.
 * =============================================================================
 */
//{{{
var Intro = function () {
    'use strict';
    
    var self = {

        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function () {
            // Load the Intro graphic
            this.background = new jaws.Sprite({image: "graphics/intro.png"});
            
            // Create the start button
            this.start_button = new jaws.Sprite({image: "graphics/start_button.png", x: 160, y: 400, anchor: "center"});
            this.button_rect = new jaws.Rect(this.start_button.x - 92, this.start_button.y - 32, 185, 64);
            
            // Direct any mouse-clicks to our on_click event-handler
            jaws.on_keydown(["left_mouse_button", "right_mouse_button"], function (key) { self.on_click(key); });
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components. This is called automatically by the
        // jaws library.
        //{{{        
        update: function () {

        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components. This is called automatically by the jaws
        // library.
        //{{{
        draw: function () {
            this.background.draw();
            this.start_button.draw();
        },
        //}}}

        // ---------------------------------------------------------------------
        // on_click()
        // ---------------------------------------------------------------------
        // This callback is called by the jaws library when the mouse is 
        // clicked. See the jaws.on_keydown() call in the setup() method.
        //{{{        
        on_click: function (key) {
            var x = jaws.mouse_x;
            var y = jaws.mouse_y - 16;
            var rune;
            if (key === "left_mouse_button") {
                if (this.button_rect.collidePoint(x, y)) {
                    jaws.switchGameState(Game);
                }
            }
        }
        //}}}
    };
    
    return self;
};
//}}}

/*
 * =============================================================================
 * Outro() - "Game Over" state handler.
 * =============================================================================
 */
//{{{
var Outro = function () {
    'use strict';
    
    var self = {

        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function () {
            this.canvas  = document.getElementById("board");
            this.context = this.canvas.getContext("2d");
            
            // Load the End Credits graphic
            this.background = new jaws.Sprite({image: "graphics/backdrop.png"});
            
            this.parallax = new jaws.Parallax({repeat_y: true, repeat_x: true});
            this.parallax.addLayer({image: "graphics/backdrop.png", damping: 1});

            // Direct any mouse-clicks to our on_click event-handler
            jaws.on_keydown(["left_mouse_button", "right_mouse_button"], function (key) { self.on_click(key); });
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components. This is called automatically by the
        // jaws library.
        //{{{        
        update: function () {
            this.parallax.camera_x += 0.25;
            if (this.parallax.camera_x == 320) {
                this.parallax.camera_x = 0.0;
            }
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components. This is called automatically by the jaws
        // library.
        //{{{
        draw: function () {
            this.background.draw();
            this.context.font      = "18px sans-serif";
            this.context.fillStyle = "#000000";
            this.context.textAlign = "center";
            this.context.fillText("Total ballons popped: " + gTotalScore, 160, 160);
            if (gHighScore) {
                this.context.fillText("High score: " + gHighScore, 160, 200);
            }
            this.context.fillText("Click to play again", 160, 240);
        },
        //}}}

        // ---------------------------------------------------------------------
        // on_click()
        // ---------------------------------------------------------------------
        // This callback is called by the jaws library when the mouse is 
        // clicked. See the jaws.on_keydown() call in the setup() method.
        //{{{        
        on_click: function (key) {
            var x = jaws.mouse_x;
            var y = jaws.mouse_y;
            if (key === "left_mouse_button") {
                jaws.switchGameState(Intro);                    
            }
        }
        //}}}
    };
    
    return self;
};
//}}}

/*
 * =============================================================================
 * Balloon() - Handles a single balloon
 * =============================================================================
 */
//{{{
var Balloon = function (options) {
    'use strict';
    
    var self = {
        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the balloon. This is called automatically by 
        // Balloons() object.
        //{{{
        setup: function (options) {
            this.btype = BalloonType.random(options.round);
            this.index = options.index || 0;
            this.detector = options.detector;
            this.reset();
            this.sprite = new jaws.Sprite({ image: this.btype.image, x: this.x, y: this.y });
            this.pop_animation = new jaws.Animation({sprite_sheet: "graphics/pop.png", frame_size: [64, 64], frame_duration: 20})
            this.pop = new jaws.Sprite({ image:this.btype.image, x: 0, y: 0 });
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components.
        //{{{        
        update: function () {
            this.x = this.x + this.drift_x;
            this.y = this.y + this.drift_y;
            this.sprite.x = this.x;
            this.sprite.y = this.y;
            if (this.state == BalloonState.POPPING) {
                if (this.pop_animation.atLastFrame()) {
                    this.state = BalloonState.POPPED;
                    this.sprite.alpha = 1;
                } else {
                    this.sprite.alpha = this.sprite.alpha - 0.33;
                    this.pop.setImage(this.pop_animation.next());
                }
            }
            if (this.is_outside_canvas() || this.state == BalloonState.POPPED) {
                this.reset();
            }
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // reset()
        // ---------------------------------------------------------------------
        // Resets the balloon, moving it off the top of the canvas and setting
        // the 'drift' parameters randomly
        //{{{
        reset: function () {
            this.state = BalloonState.NORMAL;
            if (this.pop_animation) {
                this.pop_animation.index = 0;
            };
            this.x = Math.random() * 480;
            this.y = (Math.random() * 768) - (768 + 64);
            this.drift_x = (Math.random()) - 0.5;
            this.drift_y = Math.random() + 0.1;
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components.
        //{{{
        draw: function () {
            if (this.state == BalloonState.POPPING) {
                this.pop.x = this.sprite.x;
                this.pop.y = this.sprite.y;
                this.pop.draw();
            } else {
                this.sprite.draw();
            }
        },
        //}}}
        
        is_outside_canvas: function () {
            if (this.y > 0) {
                if ((this.x < -this.sprite.width) || (this.x > jaws.canvas.width) || (this.y > 480)) {
                    return true;
                }
            }
            return false;
        },
        
        on_click: function (x, y) {
            return this.detector.detectorFor(this.btype).on_click(this.sprite, x, y);
        }
    }
    
    self.setup(options);
    return self;
}   
//}}}

/*
 * =============================================================================
 * Balloons() - Handles the collection of balloons in the game
 * =============================================================================
 */
//{{{
var Balloons = function (game) {
    'use strict';
    
    var self = {
        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function (game) {
            var i;
            var balloon;
            this.game = game;
            this.detectors = Detectors();
            // Load the sprites graphic
            this.balloons = new jaws.SpriteList({ });
            for (i = 0; i < (this.game.round * 25); i++) {
                balloon = Balloon({ index: i, round: this.game.round, detector: this.detectors });
                this.balloons.push(balloon);
            };
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components.
        //{{{        
        update: function () {
            var i;
            var balloon;
            for (i = 0; i < this.balloons.length; i++) {
                balloon = this.balloons.at(i);
                balloon.update();
            }
            /*
            this.balloons.removeIf(is_popped);
            var start = this.balloons.length;
            for (i = start; i < 50; i++) {
                balloon = Balloon({ index: i, round: this.game.round });
                this.balloons.push(balloon);
            }
            */
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components.
        //{{{
        draw: function () {
            this.balloons.draw();
        },
        //}}}
        
        on_click: function (x, y) {
            var i;
            var balloon;
            var candidates = [ ];
            for (i = 0; i < this.balloons.length; i++) {
                balloon = this.balloons.at(i);
                if (balloon.on_click(x, y)) {
                    candidates.push(balloon);
                };
            }
            if (candidates.length > 0) {
                balloon = candidates[0];
                for (i = 1; i < candidates.length; i++) {
                    if (candidates[i].index > balloon.index) {
                        balloon = candidates[i];
                    }
                }
                balloon.state = BalloonState.POPPING;
                return balloon.btype;
            } else {
                return null;
            }
        }
    }
    
    self.setup(game);
    return self;
}
//}}}

/*
 * =============================================================================
 * Game() - Main game state handler.
 * =============================================================================
 */
//{{{ 
var Game = function () { 
    'use strict';
    
    var self = {

        // ---------------------------------------------------------------------
        // Variables
        // ---------------------------------------------------------------------
        //{{{
        
        // Game components. These are actually created and initialised when the
        // setup() method is called.

        //}}}
        
        // ---------------------------------------------------------------------
        // Methods
        // ---------------------------------------------------------------------
        //{{{
        
        // ---------------------------------------------------------------------
        // setup()
        // ---------------------------------------------------------------------
        // Creates and initialises the game components. This is called
        // automatically by the jaws library.
        //{{{
        setup: function () {
            
            // The jaws library will locate the canvas element itself, but it
            // it is useful to have our reference to it, for drawing directly
            // on to the canvas.
            this.canvas  = document.getElementById("board");
            this.context = this.canvas.getContext("2d");
            
            // Set up a default font for text output on the canvas
            this.context.font      = "28px sans-serif";
            this.context.fillStyle = "#000000";
            this.context.textAlign = "center";
            
            // Load the backdrop for the game
            this.backdrop = new jaws.Sprite({image: "graphics/backdrop.png"});
            
            this.frame = new jaws.Sprite({image: "graphics/frame.png"});
            
            this.game_over = new jaws.Sprite({image: "graphics/game_over.png"});
            
            this.round = 0;
            this.seconds = 5;
            
            this.start_button = new jaws.Sprite({image: "graphics/start_button.png", x: 160, y: 240, anchor: "center"});
            this.next_button = new jaws.Sprite({image: "graphics/next_button.png", x: 160, y: 240, anchor: "center"});
            this.restart_button = new jaws.Sprite({image: "graphics/restart_button.png", x: 160, y: 424, anchor: "center"});
            this.button_rect = new jaws.Rect(this.next_button.x - 92, this.next_button.y - 32, 185, 64);
            this.restart_rect = new jaws.Rect(this.restart_button.x - 92, this.restart_button.y - 32, 185, 64);

            this.target_type = null;
            
            // Create the debug console            
            this.debug = DebugConsole({ });
            this.debug.visible = false;
            
            // Create the game timer
            this.timer = Timer();
            
            this.next_round();
            
            // Load and play the game soundtrack
            this.gameTrack = new Audio("sounds/DST-ArcOfDawn.ogg");
            this.gameTrack.volume = 1.0;
            this.gameTrack.addEventListener("ended", function () {
                this.currentTime = 0;
                this.play();
            }, false);
            this.gameTrack.play();
            
            this.popSound = new Audio("sounds/pop.ogg");
    
            this.parallax = new jaws.Parallax({repeat_y: true, repeat_x: true});
            this.parallax.addLayer({image: "graphics/backdrop.png", damping: 1});

            // Direct any mouse-clicks to our on_click event-handler
            jaws.on_keydown(["left_mouse_button", "right_mouse_button"], function (key) { self.on_click(key); });
        },
        //}}}

        start_round: function () {
            this.pop_count = 0;
            this.countdown = this.timer.startCountdown(this.seconds * 10);
            this.state = RoundState.ACTIVE;
        },

        end_round: function () {
            gTotalScore += this.pop_count;
            if (this.round == 7) {
                if (supportsLocalStorage()) {
                    gHighScore = readState("high-score");
                    if (gHighScore) {
                        if (gTotalScore > gHighScore) {
                            gHighScore = gTotalScore;
                            saveState("high-score", gHighScore);
                        }
                    } else {
                        saveState("high-score", gTotalScore);
                    }
                }
                this.state = RoundState.GAME_OVER;
            } else {
                this.state = RoundState.FINISHED;
            }
        },
        
        next_round: function () {
            this.round++;
            this.balloons = Balloons(this);
            this.seconds = (this.round * 5) + 5;
            if (this.seconds > 30) {
                this.seconds = 30;
            };
            this.balloons = Balloons(this);
            this.target_type = BalloonType.atIndex(this.round - 1);
            this.state = RoundState.WAITING;
        },
        
        // ---------------------------------------------------------------------
        // update()
        // ---------------------------------------------------------------------
        // Updates the game components. This is called automatically by the
        // jaws library.
        //{{{        
        update: function () {
            this.timer.update();
            this.parallax.camera_x += 0.25;
            if (this.parallax.camera_x == 320) {
                this.parallax.camera_x = 0.0;
            }
            this.balloons.update();
            if (this.state == RoundState.ACTIVE) {
                if (this.countdown.expired) {
                    this.end_round();
                }
            } else if (this.state == RoundState.GAME_OVER) {
                
            }
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // draw()
        // ---------------------------------------------------------------------
        // Draws the game components. This is called automatically by the jaws
        // library.
        //{{{
        draw: function () {
//            this.backdrop.draw();
            this.parallax.draw();
            if (this.state == RoundState.WAITING) {
                this.context.font      = "18px sans-serif";
                this.context.fillStyle = "#000000";
                this.context.textAlign = "center";
                this.context.fillText("Pop as many " + this.target_type.name, 160, 160);
                this.context.fillText("as you can in " + this.seconds + " seconds", 160, 184);
                this.start_button.draw();
            } else if (this.state == RoundState.ACTIVE) {
                this.balloons.draw();
            } else if (this.state == RoundState.FINISHED) {
                this.context.font      = "18px sans-serif";
                this.context.fillStyle = "#000000";
                this.context.textAlign = "center";
                this.context.fillText(this.target_type.name + " popped: " + this.pop_count, 160, 160);
                this.next_button.draw();
            } else if (this.state == RoundState.GAME_OVER) {
                this.game_over.draw();
                this.context.font      = "18px sans-serif";
                this.context.fillStyle = "#000000";
                this.context.textAlign = "center";
                this.context.fillText("Total ballons popped: " + gTotalScore, 160, 336);
                if (gHighScore) {
                    this.context.fillText("High score: " + gHighScore, 160, 364);
                }
                this.restart_button.draw();
            }

            this.frame.draw();

            if (this.state == RoundState.ACTIVE) {
                this.context.font      = "18px sans-serif";
                this.context.fillStyle = "#ffffff";
                this.context.textAlign = "left";
                this.context.fillText(this.target_type.name + " popped: " + this.pop_count, 16, 36);
                this.context.font      = "32px sans-serif";
                this.context.textAlign = "center";
                this.context.fillText("" + Math.floor(this.countdown.duration / 10), 290, 40);
            }
            this.debug.draw();
        },
        //}}}
        
        // ---------------------------------------------------------------------
        // on_click()
        // ---------------------------------------------------------------------
        // This callback is called by the jaws library when the mouse is 
        // clicked. See the jaws.on_keydown() call in the setup() method.
        //{{{        
        on_click: function (key) {
            var x = jaws.mouse_x;
            var y = jaws.mouse_y - 16;
            var rune;
            if (key === "left_mouse_button") {
                if (this.state == RoundState.ACTIVE) {
                    var popped = this.balloons.on_click(x, y);
                    if (popped) {
                        this.popSound.currentTime = 0;
                        this.popSound.play();
                        if (popped === this.target_type) {
                            this.pop_count++;
                        } else if (this.pop_count > 0) {
                            this.pop_count--;
                        }
                    };
                } else if (this.state == RoundState.WAITING) {
                    if (this.button_rect.collidePoint(x, y)) {
                        this.start_round();
                    }
                } else if (this.state == RoundState.FINISHED) {
                    if (this.button_rect.collidePoint(x, y)) {
                        this.next_round();
                    }
                } else if (this.state == RoundState.GAME_OVER) {
                    if (this.restart_rect.collidePoint(x, y)) {
                        this.round = 0;
                        this.next_round();
                    }
                }
            }
        }
        //}}}
        
        //}}}
    };
    
    return self;
    
};
//}}}

/*
 * =============================================================================
 * Main entry point
 * =============================================================================
 * Loads the game assets and launches the game.
 */
//{{{ 
jaws.onload = function () {
    // Pre-load the game assets
    jaws.assets.add([
            "graphics/intro.png",
            "graphics/end.png",
            "graphics/backdrop.png",
            "graphics/balloon_red.png",
            "graphics/balloon_green.png",
            "graphics/balloon_blue.png",
            "graphics/balloon_yellow.png",
            "graphics/balloon_purple.png",
            "graphics/balloon_lemon.png",
            "graphics/balloon_grapes.png",
            "graphics/balloon_strawberry.png",
            "graphics/balloon_blueberry.png",
            "graphics/pop.png",
            "graphics/start_button.png",
            "graphics/restart_button.png",
            "graphics/next_button.png",
            "graphics/frame.png",
            "graphics/game_over.png"
    ]); 
    // Start the game running. jaws.start() will handle the game loop for us.
    jaws.start(Intro, {fps: 60}); 
}
//}}}

