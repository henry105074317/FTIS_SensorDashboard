// Data retrieved from https://netmarketshare.com/
// Build the chart

setInterval('window.location.reload();', 15*60*1000); // 每15分鐘重整一次

$(document).ready(function () {

    const gridContainer = document.querySelector('.container-fluid');
    const rows = gridContainer.querySelectorAll('.row');
    const row_num = rows.length;

    Highcharts.setOptions({
        chart: {
            style: {
                fontWeight: 800,
            }
        }
        ,
        colors: ['rgba(56,176,0,0.7)', 'rgba(208,0,0,0.7)', 'rgba(251,133,0,0.7)'],
    });

    $.ajax({
        type: "GET",
        url: app.siteRoot + "home/GetSensorInfo",
        data: { groupby: 'Operator' },
        dataType: "json",
        success: function (data) {
            const numOfGrids = data.length; // 或是任意數量的格子
            for (var i = 0; i < numOfGrids; i++) {

                const gridItem = document.createElement('div');
                const itemId = 'chart' + (i + 1); // 這裡可以自行設定 ID 的命名方式
                gridItem.setAttribute('id', itemId); // 設定元素的 id 屬性
                gridItem.classList.add('col-12'); // 可以設定格子的 class，加入自己的樣式   
                gridItem.classList.add('col-sm-3');
                gridItem.classList.add('col-lg-2');

                rows[row_num - 1].appendChild(gridItem); // 加入格子到父容器中

                // 修正簡繁體字問題
                var new_name = data[i].Name.replace("臺", "台");
                var new_name_2 = data[i].Name_2.replace("臺", "台");
                // 找到相對應單位聯絡方式
                var mapping_index = contact.findIndex(function (item) {
                    if (new_name.includes("政府") == true) {
                        return item.Operator === new_name.substr(0,3);
                    }
                    else {
                        return item.Operator === new_name;
                    }                    
                });
                //設定title文字
                var title_text = '';
                var title_y = 0;
                if (data[i].ToBeConfirm == 0) {
                    title_text = '警戒中' + data[i].Alert + '站<br>待檢核' + data[i].ToBeConfirm + '站';
                    title_y = 85;
                } else {
                    title_text = '警戒中' + data[i].Alert + '站<br>待檢核' + data[i].ToBeConfirm + '站<br><br>待檢核最新資料時間<br>' + data[i].SourceTime;
                    title_y = 115;
                }

                Highcharts.chart('chart' + (i + 1), {
                    responsive: {
                        rules: [{
                            condition: {
                                minWidth: 300 
                            },
                            chartOptions: {
                                /* 在這裡設定手機螢幕的圖表配置 */
                                title: {
                                    y: title_y,
                                    style: { fontSize: 28},
                                },
                                subtitle: {
                                    y: -90,
                                    style: {
                                        fontSize: 28,
                                    },

                                },
                                plotOptions: {
                                    pie: {
                                        dataLabels: {
                                            enabled: true,
                                            distance: -10,
                                            style: {
                                                fontWeight: '900',
                                                color: 'black',
                                            },
                                        },
                                        startAngle: -90,
                                        endAngle: 90,
                                        center: ['50%', '75%'],
                                        size: '100%'
                                    }
                                },
                                /* 調整圖表的寬度、高度、字型大小等等 */
                            }
                        }]
                    },
                    chart: {
                        plotBackgroundColor: null,
                        plotBorderWidth: 0,
                        plotShadow: false,
                    },
                    title: {
                        text: title_text,
                        align: 'center',
                        verticalAlign: 'middle',
                        y: title_y,
                        style: {
                            fontSize: 22,
                        },
                    },
                    subtitle: {
                        text: "副標題",
                        align: 'center',
                        verticalAlign: 'middle',
                        y: -78,
                        style: {
                            color: '#000000',
                            fontSize: 24,
                        },
                        
                    },
                    tooltip: {
                        style: {
                            fontSize: 15,
                        },
                        //pointFormat: '{series.name}: <b>{point.y}站</b>'
                        pointFormat: '單位：' + contact[mapping_index]["Operator"] + ' <br> 聯絡人：' + contact[mapping_index]["Name"] + ' <br> 電話：' + contact[mapping_index]["Tel"] + ' <br> 信箱：' + contact[mapping_index]["Email"],
                    },
                    accessibility: {
                        point: {
                            valueSuffix: '%'
                        }
                    },
                    plotOptions: {
                        pie: {
                            dataLabels: {
                                enabled: true,
                                distance: -2,
                                style: {
                                    fontWeight: '900',
                                    color: 'black',
                                },
                            },
                            startAngle: -90,
                            endAngle: 90,
                            center: ['50%', '75%'],
                            size: '115%'
                        }
                    },
                    series: [{
                        type: 'pie',
                        name: '數量',
                        innerSize: '70%',
                        dataLabels: {
                            style: {
                                fontSize: 16
                            },
                            formatter: function () {
                                if (this.y === 0) {
                                    return '';
                                } else {
                                    return this.key + '<br>' + this.y + '站';
                                }
                            },
                        },
                        data: [
                            {
                                name: '正常',
                                y: data[i].Normal,
                                dataLabels: {
                                    style: {
                                        color: 'black',
                                    },
                                }
                            },
                            {
                                name: '警戒中',
                                y: data[i].Alert,
                                dataLabels: {
                                    style: {
                                        color: 'black',
                                    },
                                }
                            },
                            {
                                name: '待檢核',
                                y: data[i].ToBeConfirm,
                                dataLabels: {
                                    style: {
                                        color: 'black',
                                    },
                                }
                            },
                        ]
                    }],
                    credits: {
                        enabled: false,
                    },
                });



                var chart = $('#chart' + (i + 1)).highcharts();

                var total = 0;
                for (var k = 0; k < chart.series[0].data.length; k++) {
                    total += chart.series[0].data[k].y;
                }
                
                chart.setTitle(null, {
                    text: '<a href="https://www.dprcflood.org.tw/SGDS/FDashboard.html?county=' + new_name_2 + '" target="_blank" style="color: blue; text-decoration: underline;">' + new_name + ' 共' + total.toFixed(0) + '站</a>',
                });

                //const windowWidth = window.innerWidth;
                //const cellWidth = windowWidth / 6.07;
                //const cellWidth = windowWidth ;
                //chart.setSize(cellWidth, 270);
                chart.margin = [0, 0, 0, 0];
                chart.plotLeft = 0;
                chart.plotTop = 20;

            }
        },
    });

    var nowTime = moment().format('YYYY-MM-DD HH:mm:ss')
    $('#timetext').text(' 資料時間：' + nowTime);
});


function SwitchOnClick() {
        if ($("#myonoffswitch").prop("checked") == true) {
            //console.log("切換到CITY");
            $("#myonoffswitch").prop("value", "City");
            GetSensorInfo();
        }
        else {
            $("#myonoffswitch").prop("value", "Operator");
            GetSensorInfo();
            //console.log("切換到Operator");
    }
    var nowTime = moment().format('YYYY-MM-DD HH:mm:ss')
    $('#timetext').text(' 資料時間：' + nowTime);
}

function GetSensorInfo() {
    var groupby = $("#myonoffswitch").val();

    const gridContainer = document.querySelector('.container-fluid');
    const rows = gridContainer.querySelectorAll('.row');
    //先刪除原本分類所有元素，避免出現不同分類方式
    rows[2].innerHTML = '';

    const row_num = rows.length;

    $.ajax({
        type: "GET",
        url: app.siteRoot + "home/GetSensorInfo",
        data: { groupby: groupby },
        dataType: "json",
        success: function (data) {
            const numOfGrids = data.length; // 或是任意數量的格子
            for (var i = 0; i < numOfGrids; i++) {

                const gridItem = document.createElement('div');
                const itemId = 'chart' + (i + 1); // 這裡可以自行設定 ID 的命名方式
                gridItem.setAttribute('id', itemId); // 設定元素的 id 屬性
                gridItem.classList.add('col-12'); // 可以設定格子的 class，加入自己的樣式   
                gridItem.classList.add('col-sm-3');
                gridItem.classList.add('col-lg-2');

                rows[row_num - 1].appendChild(gridItem); // 加入格子到父容器中
                var new_name = data[i].Name.replace("臺", "台");
                var new_name_2 = data[i].Name_2.replace("臺", "台");
                var mapping_index = contact.findIndex(function (item) {
                    if (new_name.includes("政府") == true) {
                        return item.Operator === new_name.substr(0, 3);
                    }
                    else {
                        return item.Operator === new_name;
                    }

                });
                //設定title文字
                var title_text = '';
                var title_y = 0;
                if (data[i].ToBeConfirm == 0) {
                    title_text = '警戒中' + data[i].Alert + '站<br>待檢核' + data[i].ToBeConfirm + '站';
                    title_y = 85;
                } else {
                    title_text = '警戒中' + data[i].Alert + '站<br>待檢核' + data[i].ToBeConfirm + '站<br><br>待檢核最新資料時間<br>' + data[i].SourceTime;
                    title_y = 115;
                }
                Highcharts.chart('chart' + (i + 1), {
                    responsive: {
                        rules: [{
                            condition: {
                                minWidth: 300
                            },
                            chartOptions: {
                                /* 在這裡設定手機螢幕的圖表配置 */
                                title: {
                                    y: title_y,
                                    style: { fontSize: 28 },
                                },
                                subtitle: {
                                    y: -90,
                                    style: {
                                        fontSize: 28,
                                    },

                                },
                                plotOptions: {
                                    pie: {
                                        dataLabels: {
                                            enabled: true,
                                            distance: -2,
                                            style: {
                                                fontWeight: '900',
                                                color: 'black',
                                            },
                                        },
                                        startAngle: -90,
                                        endAngle: 90,
                                        center: ['50%', '75%'],
                                        size: '100%'
                                    }
                                },
                                /* 調整圖表的寬度、高度、字型大小等等 */
                            }
                        }]
                    },
                    chart: {
                        plotBackgroundColor: null,
                        plotBorderWidth: 0,
                        plotShadow: false
                    },
                    title: {
                        text: title_text,
                        align: 'center',
                        verticalAlign: 'middle',
                        y: title_y,
                        style: {
                            color: '#000000',
                            fontSize: 22,
                        },
                    },
                    subtitle: {
                        text: "Total: 0",
                        align: 'center',
                        verticalAlign: 'middle',
                        y: -78,
                        style: {
                            color: '#000000',
                            fontSize: 24,
                        },
                    },
                    tooltip: {
                        style: {
                            fontSize: 15,
                        },
                        pointFormat: '單位：' + contact[mapping_index]["Operator"] + ' <br> 聯絡人：' + contact[mapping_index]["Name"] + ' <br> 電話：' + contact[mapping_index]["Tel"] + ' <br> 信箱：' + contact[mapping_index]["Email"]
                    },
                    accessibility: {
                        point: {
                            valueSuffix: '%'
                        }
                    },
                    plotOptions: {
                        pie: {
                            dataLabels: {
                                enabled: true,
                                distance: -32,
                                style: {
                                    fontWeight: '900',
                                    color: 'black',
                                },
                            },
                            startAngle: -90,
                            endAngle: 90,
                            center: ['50%', '75%'],
                            size: '115%'
                        }
                    },
                    series: [{
                        type: 'pie',
                        name: '數量',
                        innerSize: '70%',
                        dataLabels: {
                            style: {
                                fontSize: 14
                            },
                            formatter: function () {
                                if (this.y === 0) {
                                    return '';
                                } else {
                                    return this.key + '<br>' + this.y + '站';
                                }
                            },
                        },
                        data: [
                            {
                                name: '正常',
                                y: data[i].Normal,
                                dataLabels: {
                                    style: {
                                        color: 'black',
                                    },
                                }
                            },
                            {
                                name: '警戒中',
                                y: data[i].Alert,
                                dataLabels: {
                                    style: {
                                        color: 'black',
                                    },
                                }
                            },
                            {
                                name: '待檢核',
                                y: data[i].ToBeConfirm,
                                dataLabels: {
                                    style: {
                                        color: 'black',
                                    },
                                }
                            },
                        ]
                    }],
                    credits: {
                        enabled: false,
                    },
                });



                var chart = $('#chart' + (i + 1)).highcharts();

                var total = 0;
                for (var k = 0; k < chart.series[0].data.length; k++) {
                    total += chart.series[0].data[k].y;
                }

                chart.setTitle(null, {
                    text: '<a href="https://www.dprcflood.org.tw/SGDS/FDashboard.html?county=' + new_name_2 + '" target="_blank" style="color: blue; text-decoration: underline;">' + new_name + ' 共' + total.toFixed(0) + '站</a>',
                });

                //const windowWidth = window.innerWidth;
                //const cellWidth = windowWidth / 6.07;
                //chart.setSize(cellWidth, 270);
                chart.margin = [0, 0, 0, 0];
                chart.plotLeft = 0;
                chart.plotTop = 20;

            }
        },
    });
}







