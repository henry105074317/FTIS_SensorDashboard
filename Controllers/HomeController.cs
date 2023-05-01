using Newtonsoft.Json;
using RestSharp;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web;
using System.Web.Mvc;
using System.Xml;
using System.Xml.Serialization;

namespace WSensor_DashB.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }

        public string GetSensorInfo()
        {
            string groupby = Request.QueryString["groupby"];

            List<rusultlist> sensorinfos = GetEachSensorInfo(groupby);


            //建立Table 欄位
            DataTable finalTable = new DataTable();

            finalTable.Columns.Add("Name", typeof(String));
            finalTable.Columns.Add("Name_2", typeof(String));
            finalTable.Columns.Add("Normal", typeof(int));
            finalTable.Columns.Add("Alert", typeof(int));
            finalTable.Columns.Add("ToBeConfirm", typeof(int));

            sensorinfos.ForEach(EachSensor =>
            {
                DataRow[] old_row = finalTable.Select("Name = '" + EachSensor.Name + "'"); //先找Table當中有沒有重複資料
                int row_len = old_row.Length;
                int Normal = 0;
                int Alert = 0;
                int ToBeConfirm = 0;
                if (row_len == 0) // Table當中沒有資料 新增一筆
                {                   
                    DataRow row = finalTable.NewRow();
                    row["Name"] = EachSensor.Name;
                    row["Name_2"] = EachSensor.Name_2;
                    if (EachSensor.Stage == "ToBeConfirm") // 該測站狀態為"待檢核"
                    {
                        ToBeConfirm += 1;
                    }
                    else if (EachSensor.Stage == "Alert")
                    {
                        Alert += 1;
                    }
                    else if (EachSensor.Stage == "Normal")
                    {
                        Normal += 1;
                    }
                    row["Normal"] = Normal;
                    row["Alert"] = Alert;
                    row["ToBeConfirm"] = ToBeConfirm;
                    finalTable.Rows.Add(row);
                }
                else //資料表中已有資料，取出欄位更新
                {
                    if (EachSensor.Stage == "ToBeConfirm") // 該測站狀態為"待檢核"
                    {
                        ToBeConfirm += 1;
                        old_row[0]["ToBeConfirm"] = Convert.ToInt32(old_row[0]["ToBeConfirm"]) + ToBeConfirm;
                    }
                    else if (EachSensor.Stage == "Alert")
                    {
                        Alert += 1;
                        old_row[0]["Alert"] = Convert.ToInt32(old_row[0]["Alert"]) + Alert;
                    }
                    else if (EachSensor.Stage == "Normal")
                    {
                        Normal += 1;
                        old_row[0]["Normal"] = Convert.ToInt32(old_row[0]["Normal"]) + Normal;
                    }
                }
            });

            // 把Table重新排序
            DataTable OutputTable = finalTable.Copy();
            var Rows = (from row in OutputTable.AsEnumerable()
                        orderby row["Alert"] descending, row["ToBeConfirm"] descending
                        select row);
            OutputTable = Rows.AsDataView().ToTable();

            // 輸出成json
            List<Dictionary<string, object>> parentRow = new List<Dictionary<string, object>>();
            Dictionary<string, object> childRow;
            foreach (DataRow row in OutputTable.Rows)
            {
                childRow = new Dictionary<string, object>();
                foreach (DataColumn col in OutputTable.Columns)
                {
                    childRow.Add(col.ColumnName, row[col]);
                }
                parentRow.Add(childRow);
            }
            var json = JsonConvert.SerializeObject(parentRow);
            //var result = new HttpResponseMessage(HttpStatusCode.OK);
            //result.Content = new StringContent(json);
            //result.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            return json;
        }

        public List<rusultlist> GetEachSensorInfo(string groupby) //取得全國每隻淹感的狀態
        {
            bool byCity = true;
            if (groupby == "City")
            {
                byCity = true;
            }
            else if (groupby == "Operator")
            {
                byCity = false;
            }
            

            List<sensorData> SensorLists = SensorRegionList(); // 淹感基本資料表
            List<CityList> cityLists = CityNameList(); // 縣市代碼轉名稱
            List<UnitList> unitLists = OperatorList(); // 建制單位代碼轉名稱

            string url = "https://www.dprcflood.org.tw/SGDS/WS/FHYBrokerWS.asmx/GetFHYFloodSensorInfoRt";
            XmlTextReader reader = new XmlTextReader(url);
            List<sensorinfo> Xmlvalue = new List<sensorinfo>();

            DateTime DateTime = new DateTime();
            string Depth = "";
            string SensorUUID = "";
            string ToBeConfirm = "";

            string Element = "";

            //讀取整個XML
            while (reader.Read())
            {
                switch (reader.NodeType)
                {
                    case XmlNodeType.Element:
                        Element = reader.Name;
                        break;
                    case XmlNodeType.Text:

                        switch (Element)
                        {
                            case "SensorUUID":
                                SensorUUID = reader.Value;
                                break;
                            case "Depth":
                                Depth = reader.Value;
                                break;
                            case "SourceTime":
                                DateTime = Convert.ToDateTime(reader.Value);
                                break;
                            case "ToBeConfirm": // true 待確認 false 正常
                                ToBeConfirm = reader.Value;
                                Xmlvalue.Add(new sensorinfo() { DateTime = DateTime, SensorUUID = SensorUUID, ToBeConfirm = ToBeConfirm, Depth = Depth });//把XML塞進LIST
                                break;
                        }
                        break;
                }
            }
            reader.Close();

            List<rusultlist> outlist = new List<rusultlist>();

            Xmlvalue.ForEach(sensor =>
            {
                string[] Name_arr = GetName(sensor.SensorUUID, SensorLists, cityLists, unitLists, byCity);
                string Stage = "";
                if (sensor.ToBeConfirm == "true")
                {
                    Stage = "ToBeConfirm";
                }
                else if (sensor.ToBeConfirm == "false")
                {
                    if (Convert.ToInt32(sensor.Depth) >= 10.0)
                    {
                        Stage = "Alert";
                    }
                    else
                    {
                        Stage = "Normal";
                    }
                }
                outlist.Add(new rusultlist() { Name = Name_arr[0], Name_2 = Name_arr[1], Stage = Stage });
            }
            );

            return outlist;
        }

        public string[] GetName(string UUID, List<sensorData> sensorDatas, List<CityList> cityLists, List<UnitList> unitLists, bool byCity)
        {
            try
            {
                int index = sensorDatas.FindIndex(x => x.SensorUUID == UUID); //搜尋相同的淹感資料
                string CityCode = sensorDatas[index].CityCode;
                string UnitCode = sensorDatas[index].Operator;
                string Name = "";
                string Name_2 = "";
                int index_city;
                int index_unit;

                if (byCity == true)
                {
                    index_city = cityLists.FindIndex(x => x.CityCode == CityCode);
                    index_unit = unitLists.FindIndex(x => x.id == UnitCode);
                    Name = cityLists[index_city].CityName;
                    Name_2 = cityLists[index_city].CityName;
                }
                else
                {
                    index_city = cityLists.FindIndex(x => x.CityCode == CityCode);
                    index_unit = unitLists.FindIndex(x => x.id == UnitCode);                   
                    Name = unitLists[index_unit].Name;
                    Name_2 = cityLists[index_city].CityName; //建制單位的縣市
                }

                string[] result = new string[] { Name, Name_2 };
                return result;
            }
            catch
            {
                Response.Write("<Script language='JavaScript'>alert('發生問題，請聯絡程式開發人員');</Script>");
                return new string[] { };
            }

        }


        public List<sensorData> SensorRegionList() //將全國所有淹感的建置單位.縣市輸出List
        {
            XmlTextReader reader = new XmlTextReader(Server.MapPath("../") + "/Data/GetFHYFloodSensorStation.xml");
            List<sensorData> Xmlvalue = new List<sensorData>();
            string SensorUUID = "";
            string Operator = "";
            string CityCode = "";

            string Element = "";

            while (reader.Read())
            {
                switch (reader.NodeType)
                {
                    case XmlNodeType.Element:
                        Element = reader.Name;
                        break;
                    case XmlNodeType.Text:
                        switch (Element)
                        {
                            case "SensorUUID":
                                SensorUUID = reader.Value;
                                break;

                            case "Operator":
                                Operator = reader.Value;
                                break;
                            case "CityCode":
                                CityCode = reader.Value;
                                Xmlvalue.Add(new sensorData() { SensorUUID = SensorUUID, Operator = Operator, CityCode = CityCode });//把XML塞進LIST
                                break;

                        }
                        break;
                }


            }
            reader.Close();

            return Xmlvalue;
        }
        public List<CityList> CityNameList() // 建立縣市列表
        {
            XmlTextReader reader = new XmlTextReader(Server.MapPath("../") + "/Data/GetFHYCity.xml");
            List<CityList> Xmlvalue = new List<CityList>();
            string CityName = "";
            string CityCode = "";

            string Element = "";

            while (reader.Read())
            {
                switch (reader.NodeType)
                {
                    case XmlNodeType.Element:
                        Element = reader.Name;
                        break;
                    case XmlNodeType.Text:
                        switch (Element)
                        {
                            case "Code":
                                CityCode = reader.Value;
                                break;

                            case "zh_TW":
                                CityName = reader.Value;
                                Xmlvalue.Add(new CityList() { CityCode = CityCode, CityName = CityName });//把XML塞進LIST
                                break;

                        }
                        break;
                }


            }
            reader.Close();

            return Xmlvalue;
        }
        public List<UnitList> OperatorList() // 建置單位List
        {
            StreamReader sr = new StreamReader(Server.MapPath("../") + "/Data/機關單位.txt"); //path是要讀取的文件的完整路徑

            String Unit = sr.ReadToEnd(); //從開始到末尾讀取文件的所有內容，str_read 存放的就是讀取到的文本 
            sr.Close();  //讀完文件記得關閉流   如果要一條一條讀

            var Operator = JsonConvert.DeserializeObject<List<UnitList>>(Unit);

            return Operator;
        }



        public class sensorinfo
        {
            public DateTime DateTime { get; set; }
            public string Depth { get; set; }
            public string SensorUUID { get; set; }
            public string ToBeConfirm { get; set; }
        }

        public class sensorData
        {
            public string SensorUUID { get; set; }
            public string Operator { get; set; }
            public string CityCode { get; set; }

        }

        public class CityList
        {
            public string CityCode { get; set; }
            public string CityName { get; set; }
        }

        public class UnitList
        {
            public string id { get; set; }
            public string Name { get; set; }
        }

        public class rusultlist
        {
            public string Name { get; set; }
            public string Name_2 { get; set; }
            public string Stage { get; set; }
        }

    }
}