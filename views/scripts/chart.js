<script>
	var colors = ['006BA4', 'FF800E', 'ABABAB', '595959', '5F9ED1', 'C85200', '898989', 'A2C8EC', 'FFBC79', 'CFCFCF'];

var user_data = !{be_userdata};
var event_data = !{be_eventdata};
function updategraph(user_data, event_data){

	var drink_events = event_data['drink_events'];

	drink_events.sort(function (e1, e2) {
		return e1.user - e2.user;
	});

	var usernames = {};
	for (var i = 0; i < user_data.length; i++) {
		var user = user_data[i];
		usernames[user.id] = user.username;
	}

	var user_indices = {};
	var datasets = [];

	for (var i = 0; i < drink_events.length; i++) {
		var user_id = drink_events[i].user;
		var date = new Date(drink_events[i].datetime);

		var user_index;
		if (!user_indices.hasOwnProperty(user_id)) {
			user_index = user_indices[user_id] = datasets.length;

			var color = '#' + colors[user_index];

			datasets.push({
				label: usernames[user_id],
				showLine: true,
				fill: false,
				borderColor: color,
				data: [],
			});
		} else {
			user_index = user_indices[user_id];
		}

		var data = datasets[user_index].data;

		data.push({
			x: date,
			y: data.length + 1,
		});
	}

	var ctx = document.getElementById('chart').getContext('2d');
	var chart = new Chart(ctx, {
		type: 'scatter',

		// The data for our dataset
		data: {
			//labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
			datasets: datasets,
		},

		// Configuration options go here
		options: {
			scales: {
				xAxes: [{
					type: 'time',
					time: {
						displayFormats: {
							millisecond: 'HH:mm:ss.SSS',
							second: 'HH:mm:ss',
							minute: 'HH:mm',
						},
					},
				}],
			},
		},
	});
};
setInterval(updategraph(user_data, event_data), 10000);
</script>
