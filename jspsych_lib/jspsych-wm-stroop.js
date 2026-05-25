/**
 * jspsych-wm-stroop
 * plugin for wm stroop task seen in Kiyonaga & Egner (2014)
 * Created by Janna W. Wennberg, 2026
  */

var wm_stroop_css_added = false;

var jsPsychWMStroop = (function (jsPsych) {
	const info = {
		name: 'wm-stroop',
		parameters: {
			task_trial_index: {
  				type: jsPsych.ParameterType.INT,
				default: null,
				description: 'Global trial index'
			},
			is_practice: {
				type: jsPsych.ParameterType.BOOL,
				default: false,
				description: 'Practice trial?'
			},
			wm_word: {
				type: jsPsych.ParameterType.STRING,
				default: null,
				description: 'Word to display'
			},
			wm_color: {
				type: jsPsych.ParameterType.STRING,
				default: null,
				description: 'Color category of the WM word (blue/green/yellow/red)'
			},
			stim_congruent: {
				type: jsPsych.ParameterType.BOOL,
				default: true,
				description: 'Are the word and color patch congruent?',
			},
			patch_color: {
				type: jsPsych.ParameterType.STRING,
				default: null,
				description: 'Color of the patch to display'
			},
			wm_congruent: {
				type: jsPsych.ParameterType.BOOL,
				default: undefined,
				description: 'Is the response word the same as the word they saw?'
			},
			wm_probe: {
				type: jsPsych.ParameterType.STRING,
				default: null,
				description: 'Word to display at WM response screen'
			},

			// timing (defaults are from Kiyonaga & Egner, 2014)
			wait_before_start: {type: jsPsych.ParameterType.INT, default: 1500, description: "Time in ms to wait before trial start"},
			wm_sample_time: {type: jsPsych.ParameterType.INT, default: 1000, description: "Time in ms to display WM sample (the word)"},
			post_wm_delay: {type: jsPsych.ParameterType.INT, default: 2000, description: "Time in ms between WM sample and color patch"},
			color_patch_time: {type: jsPsych.ParameterType.INT, default: 500, description: "Time in ms to display color patch"},
			post_patch_delay: {type: jsPsych.ParameterType.INT, default: 1000, description: "Time in ms between color patch and probe"},
			wm_response_time: {type: jsPsych.ParameterType.INT, default: 3000, description: "Time in ms to respond to WM probe"},
			
			// display configuration
			text_size: {type: jsPsych.ParameterType.INT, default: 100, description: "Font size"},
			patch_width: {type: jsPsych.ParameterType.INT, default: 200, description: "Patch width in px"},
			expt_box_size: {type: jsPsych.ParameterType.INT, default: 500, description: "Width/height of box in px"},
			background_color: {type: jsPsych.ParameterType.STRING, default: '#DDDDDD', description: 'Test box background'},
		}
	}

	 /*
	 * Trial sequence:
	 *  1. [wait_before_start]  Blank screen
	 *  2. [wm_sample_time]     WM word shown (e.g. "blue")
	 *  3. [post_wm_delay]      Blank screen
	 *  4. [color_patch_time]   Color patch shown — respond with d/f/j/k
	 *                          (response window continues into post_patch_delay)
	 *  5. [post_patch_delay]   Blank screen, patch response still accepted
	 *  6. [wm_response_time]   WM probe shown — respond with g/h
	 */

	class WMStroopPlugin {
		constructor(jsPsych) {
			this.jsPsych = jsPsych;
		}

		trial(display_element, trial) {
			
			const jsPsych = this.jsPsych;

			/* Add CSS for classes just once when 
			  plugin is first used: 
			--------------------------------*/
			if (!wm_stroop_css_added) {
				var css = `
			#stroopBox {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				margin: 0 auto;
				border: 1px solid black;
				position: relative;
				padding: 20px;
				gap: 20px;
			}
			.stroopWord {
				position: absolute;
				align-items: center;
				justify-content: center;
				width: 100%;
			}
			.stroopPatch {
				position: absolute;
				align-items: center;
				justify-content: center;
				background: transparent;
				width: 100%;
			}
			#ResponseDiv {
  				position: absolute;
				left: 0px;
				width: 100%;
				height: 100%;
				top: 0px;
			}
			.patchOptions {
				font-size: 18px;
				padding: 10px 14px;
				cursor: pointer;
			}
			.wmOptions {
				font-size: 18px;
				padding: 10px 14px;
				cursor: pointer;
			}
			`;
				var styleSheet = document.createElement("style");
				styleSheet.type = "text/css";
				styleSheet.innerText = css;
				document.head.appendChild(styleSheet);
				wm_stroop_css_added = true;

			}

			// ---- Configuring trial ----
			var wm_response_made = false;
			var patch_response_made = false;

			const color_definitions = {
				blue:   { name: "blue",   rgb: [0, 0, 255],    key: 'd' },
				green:  { name: "green",  rgb: [25, 200, 25],  key: 'f' },
				yellow: { name: "yellow", rgb: [225, 215, 40], key: 'j' },
				red:    { name: "red",    rgb: [255, 0, 0],    key: 'k' },
			};

			const col = color_definitions[trial.patch_color];
			const response_word = trial.wm_probe;

			// Build display box
			var width = trial.expt_box_size;
			var height = width;
			var center = width / 2;

			// declaring overall box html
			var html = `<div id="stroopBox" style="
						width:${width}px; 
						height: ${height}px; background-color: ${trial.background_color}">
						<span id="fcMemoryFixation" style="cursor: pointer;
						position: absolute;
						top:${center - 10}px;
						left:${center - 10}px"></span>`;

			// declaring stroop color patch html
			// setting border-radius to 0 makes it square
			const patch_height = 0.75*trial.patch_width
			html += `<div id="stroopPatch" class="stroopPatch" 
						style="border-radius:0;
                	 	width:${trial.patch_width}px; 
                		height:${patch_height}px"></div>`;

			// declaring stroop word html
			html += `<div id="stroopWord" class="stroopWord"></div>`;

			// declaring response html
			html += `<div id="ResponseDiv" style="position:absolute; bottom: 40px; width:100%; text-align:center;"></div>`;

			display_element.innerHTML = html;

			// Start the trial
			var start_trial = () => {
				setTimeout(show_word, trial.wait_before_start);
			};
			
			start_trial()
			
			// --- #1: WM SAMPLE (e.g. word to remember) ----- 
			function show_word() {
				// put text in stroop word div
				document.getElementById('stroopWord').innerHTML = `<p style="font-size: ${trial.text_size}px;">${trial.wm_word}</p>`;
				setTimeout(hide_word, trial.wm_sample_time);
			}

			var hide_word = function () {
				// hide the word
				document.getElementById('stroopWord').innerHTML = "";
				setTimeout(show_patch, trial.post_wm_delay);
			}

			// --- #2: COLOR PATCH & RESPONSE -----
			let patch_response_start = null;
			var show_patch = function () {
				// Show WM patch
				document.getElementById('stroopPatch').style.backgroundColor = 'rgb('
            		+ Math.round(col.rgb[0]) + ','
            		+ Math.round(col.rgb[1]) + ','
            		+ Math.round(col.rgb[2]) + ')';

				// show text indicating response
				document.getElementById('ResponseDiv').innerHTML = `<p style="font-size: ${trial.text_size/4}px;">Judge the color of the rectangle!</p>`;

				// Show responses and start timer
				patch_response_start = performance.now();
				
				// Listen for keypress during patch
    			document.addEventListener('keydown', judge_patch_response);
				
				// Set timeout
				setTimeout(hide_patch, trial.color_patch_time);
			};

			var hide_patch = function () {
				// hide the patch, but continue response period
				document.getElementById('stroopPatch').style.backgroundColor = 'transparent';

				setTimeout(show_wm_response, trial.post_patch_delay);
			};

			var patch_correct = null;
			var patch_rt = null;
			var patch_key_pressed = null;

			var judge_patch_response = function (e) {
				if (patch_response_made) return; // ignore extra key presses
				patch_response_made = true;
				document.removeEventListener('keydown', judge_patch_response);

				patch_key_pressed = e.key.toLowerCase();
				patch_rt = performance.now() - patch_response_start;
				patch_correct = (patch_key_pressed === col.key);
				console.log("Key pressed:", patch_key_pressed, "RT:", patch_rt, "Correct:", patch_correct);

			};

			// --- #3: WM RESPONSE -----

			let wm_response_start = null;
			let wm_deadline = null;

			// WM response keys: g=same, h=different
			var show_wm_response = function () {
				// end response window for patch
				document.removeEventListener('keydown', judge_patch_response);

				// Start listening for patch key press
    			document.addEventListener('keydown', judge_wm_response);
				document.getElementById('ResponseDiv').innerHTML = `<p style="font-size: ${trial.text_size/4}px;">Same (g) or different (h)?</p>`;
				document.getElementById('stroopWord').innerHTML = `<p style="font-size: ${trial.text_size}px;">${response_word}</p>`;
				wm_response_start = performance.now();

				wm_deadline = setTimeout(end_response_window, trial.wm_response_time); // deadline

			}

			var wm_correct = null;
			var wm_rt = null;
			var wm_key_pressed = null;
			var judge_wm_response = function (e) {
				if (wm_response_made) return; // ignore extra clicks
				wm_response_made = true;
				clearTimeout(wm_deadline); // cancel the deadline since they responded

				wm_key_pressed = e.key.toLowerCase();
				wm_rt = performance.now() - wm_response_start;
				wm_correct = (wm_key_pressed === "g") === trial.wm_congruent;
				console.log("Key pressed:", wm_key_pressed, "RT:", wm_rt, "Correct:", wm_correct);

				end_response_window();
			};

			// --- END THE TRIAL -----
			var end_response_window = function () {
				document.removeEventListener('keydown', judge_wm_response);
				document.getElementById('ResponseDiv').innerHTML = '';

				if (trial.is_practice) {
					show_feedback();
				} else {
					end_trial();
				}
			};
			
			// show feedback, if applicable
			let feedback_text = null;
			var show_feedback = function () {
				if (patch_correct & wm_correct){
					feedback_text = "Color and memory were both correct!"	
				} else if (patch_correct & !wm_correct) {
					feedback_text = "Color correct / Memory incorrect"
				} else if (!patch_correct & wm_correct) {
					feedback_text = "Color incorrect / Memory correct"
				} else if (!patch_correct & !wm_correct) {
					feedback_text = "Color and memory were both incorrect"
				}
				document.getElementById('ResponseDiv').innerHTML = `<p style="font-size: ${trial.text_size/4}px;">${feedback_text}</p>`;

				// Wait 2sec and then end the trial
				setTimeout(end_trial, 2000);
			};

			/* End trial and record information:  
			-------------------------------- */
			var end_trial = function () {				
				const trial_data = {
					task_type: "wm-stroop",
					is_practice: trial.is_practice,
  					task_trial_index: trial.task_trial_index,

					iti: trial.wait_before_start,
					wm_sample_time: trial.wm_sample_time,
					post_wm_delay: trial.post_wm_delay,
					color_patch_time: trial.color_patch_time,
					post_patch_delay: trial.post_patch_delay,
					wm_max_response: trial.wm_response_time,

					wm_word: trial.wm_word,
					patch_color: col.name,
					response_word: response_word,

					stim_congruent: trial.stim_congruent,
					wm_congruent: trial.wm_congruent,

					patch_key_pressed: patch_key_pressed,
					patch_correct: patch_correct,
					patch_rt: patch_rt,

					wm_key_pressed: wm_key_pressed,
					wm_correct: wm_correct,
					wm_rt: wm_rt,
				};

				jsPsych.finishTrial(trial_data);
			};

		};

	}
	WMStroopPlugin.info = info;
	return WMStroopPlugin;
})(jsPsychModule);

