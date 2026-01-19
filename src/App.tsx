import React, { useState, useEffect } from "react";
import {
  Upload,
  Button,
  Table,
  message,
  Card,
  Form,
  InputNumber,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Select,
} from "antd";
import {
  InboxOutlined,
  SearchOutlined,
  DollarOutlined,
  DownloadOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import "./App.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface FreightRule {
  key: string;
  origin: string;
  destination: string;
  minWeight?: number;
  maxWeight?: number;
  weight?: number; // 兼容只有单一重量的情况
  price: number;
  rawData?: Record<string, unknown>; // 存储原始数据以便展示
}

interface ColumnType {
  title: string;
  dataIndex: string;
  key: string;
}

const App: React.FC = () => {
  const [rules, setRules] = useState<FreightRule[]>([]);
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataMsg, setDataMsg] = useState<string>("当前无数据，请上传 Excel。");
  const [isCustomData, setIsCustomData] = useState(false);
  const [currentView, setCurrentView] = useState<"calculator" | "importer">(
    "calculator",
  );
  const [form] = Form.useForm();

  // 提取唯一选项
  const originOptions = React.useMemo(() => {
    if (rules.length === 0) return [];
    return Array.from(new Set(rules.map((r) => r.origin)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [rules]);

  const destOptions = React.useMemo(() => {
    if (rules.length === 0) return [];
    return Array.from(new Set(rules.map((r) => r.destination)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [rules]);

  const weightOptions = React.useMemo(() => {
    if (rules.length === 0) return [];
    return Array.from(
      new Set(
        rules.map((r) => r.weight).filter((w): w is number => w !== undefined),
      ),
    ).sort((a, b) => a - b);
  }, [rules]);

  // 通用解析逻辑
  const parseExcelData = React.useCallback(
    (
      data: ArrayBuffer | string,
      type: "binary" | "array" = "binary",
      saveToStorage = false,
    ) => {
      try {
        const workbook = XLSX.read(data, { type });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: unknown[] = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
          message.error("Excel 文件为空");
          return;
        }

        // 动态生成表格列用于展示
        const keys = Object.keys(jsonData[0] as object);
        const tableColumns = keys.map((key) => ({
          title: key,
          dataIndex: key,
          key: key,
        }));
        setColumns(tableColumns);

        // 检查是否为横向重量列格式（例如：1kg, 2kg, ...）
        const weightCols = keys.filter((k) => /^\d+(\.\d+)?kg$/i.test(k));
        let parsedRules: FreightRule[] = [];

        if (weightCols.length > 0) {
          // 新格式：横向展开
          parsedRules = jsonData.flatMap((item, index) => {
            const row = item as Record<string, string | number>;
            const origin = String(
              row["始发地"] || row["Origin"] || row["origin"] || "",
            );
            const destination = String(
              row["目的地"] || row["Destination"] || row["destination"] || "",
            );

            return weightCols
              .map((col) => {
                const weightVal = parseFloat(col.replace(/kg/i, ""));
                const priceVal = Number(row[col]);

                // 如果价格无效或为空，则跳过该规则（可选）
                if (isNaN(priceVal)) return null;

                return {
                  key: `${index}-${col}`,
                  origin: origin.trim(),
                  destination: destination.trim(),
                  weight: weightVal,
                  price: priceVal,
                  rawData: row,
                };
              })
              .filter(Boolean) as FreightRule[];
          });
        } else {
          // 原有格式：纵向列表
          parsedRules = jsonData.map((item, index) => {
            const row = item as Record<string, string | number>;
            // 尝试多种可能的列名匹配
            const origin = String(
              row["始发地"] || row["Origin"] || row["origin"] || "",
            );
            const destination = String(
              row["目的地"] || row["Destination"] || row["destination"] || "",
            );

            // 重量处理：支持区间或单一重量
            const minWeight =
              row["最小重量"] ||
              row["MinWeight"] ||
              row["min_weight"] ||
              row["minWeight"];
            const maxWeight =
              row["最大重量"] ||
              row["MaxWeight"] ||
              row["max_weight"] ||
              row["maxWeight"];
            const weight = row["重量"] || row["Weight"] || row["weight"];

            // 价格处理
            const price =
              row["价格"] ||
              row["金额"] ||
              row["Price"] ||
              row["Amount"] ||
              row["price"] ||
              0;

            return {
              key: index.toString(),
              origin: origin.trim(),
              destination: destination.trim(),
              minWeight: minWeight ? Number(minWeight) : undefined,
              maxWeight: maxWeight ? Number(maxWeight) : undefined,
              weight: weight ? Number(weight) : undefined,
              price: Number(price),
              rawData: row,
            };
          });
        }

        setRules(parsedRules);
        setDataLoaded(true);

        if (saveToStorage) {
          try {
            const storageData = {
              rules: parsedRules,
              columns: tableColumns,
              timestamp: new Date().getTime(),
            };
            localStorage.setItem(
              "freight_data_cache",
              JSON.stringify(storageData),
            );
            setIsCustomData(true);
            setDataMsg("已加载您上传的本地数据（自动保存）。");
            message.success(`成功加载并保存 ${parsedRules.length} 条规则`);
          } catch (e) {
            console.warn("数据量过大，无法保存到本地缓存", e);
            message.warning(
              `加载成功，但数据量过大无法自动保存（${parsedRules.length} 条）`,
            );
            setIsCustomData(false);
            setDataMsg("已加载上传的数据。");
          }
        } else {
          if (!isCustomData) {
            setDataMsg("已加载系统默认数据。");
          }
        }
      } catch (error) {
        console.error(error);
        message.error("解析 Excel 文件失败");
      }
    },
    [isCustomData],
  );

  const loadDefaultData = React.useCallback(async () => {
    try {
      const response = await fetch("/freight_data.xlsx");
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        parseExcelData(arrayBuffer, "array", false);
        setIsCustomData(false);
        setDataMsg("已加载系统默认数据。");
        console.log("默认数据加载成功");
      }
    } catch (error) {
      console.warn("未找到默认数据文件，请手动上传", error);
      setDataMsg("未找到默认数据，请上传 Excel。");
    }
  }, [parseExcelData]);

  // 1. 初始化加载：优先检查缓存，没有则加载默认文件
  useEffect(() => {
    const initData = async () => {
      // 检查缓存
      const cachedData = localStorage.getItem("freight_data_cache");
      if (cachedData) {
        try {
          const { rules, columns } = JSON.parse(cachedData);
          setRules(rules);
          setColumns(columns);
          setDataLoaded(true);
          setIsCustomData(true);
          setDataMsg("已加载您上次上传的数据。");
          console.log("从本地缓存加载数据成功");
          return;
        } catch (e) {
          console.error("解析缓存数据失败", e);
          localStorage.removeItem("freight_data_cache"); // 清除损坏的缓存
        }
      }

      // 没有缓存或缓存无效，加载默认文件
      await loadDefaultData();
    };

    initData();
  }, [loadDefaultData]);

  // 清除缓存并重置
  const handleResetData = () => {
    localStorage.removeItem("freight_data_cache");
    setIsCustomData(false);
    setRules([]);
    loadDefaultData();
    message.success("已重置为默认数据");
  };

  // 处理手动 Excel 上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data) {
        parseExcelData(data as string, "binary", true);
      }
    };
    reader.readAsBinaryString(file);
    return false; // 阻止自动上传
  };

  // 下载模版
  const handleDownloadTemplate = () => {
    const templateData = [
      { 始发地: "北京", 目的地: "上海", 最小重量: 0, 最大重量: 10, 价格: 100 },
      { 始发地: "北京", 目的地: "上海", 最小重量: 10, 最大重量: 20, 价格: 180 },
      { 始发地: "深圳", 目的地: "成都", 最小重量: 0, 最大重量: 100, 价格: 500 },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "freight_template.xlsx");
  };

  // 计算运费
  const onFinish = (values: {
    origin: string;
    destination: string;
    weight: number;
  }) => {
    setLoading(true);
    setCalculatedPrice(null);

    const { origin, destination, weight } = values;
    const searchOrigin = origin.trim();
    const searchDest = destination.trim();
    const searchWeight = Number(weight);

    // 查找匹配规则
    const matchedRule = rules.find((rule) => {
      // 1. 匹配始发地和目的地
      const matchRoute =
        rule.origin === searchOrigin && rule.destination === searchDest;
      if (!matchRoute) return false;

      // 2. 匹配重量
      // 情况A: 规则是区间 (Min <= Weight <= Max)
      if (rule.minWeight !== undefined && rule.maxWeight !== undefined) {
        return searchWeight >= rule.minWeight && searchWeight <= rule.maxWeight;
      }
      // 情况B: 规则是区间 (Min <= Weight) - 只有下限
      if (rule.minWeight !== undefined && rule.maxWeight === undefined) {
        return searchWeight >= rule.minWeight;
      }
      // 情况C: 规则是区间 (Weight <= Max) - 只有上限
      if (rule.minWeight === undefined && rule.maxWeight !== undefined) {
        return searchWeight <= rule.maxWeight;
      }
      // 情况D: 精确匹配重量
      if (rule.weight !== undefined) {
        return rule.weight === searchWeight;
      }

      return false;
    });

    setTimeout(() => {
      if (matchedRule) {
        setCalculatedPrice(matchedRule.price);
        message.success("查询成功");
      } else {
        message.warning("未找到匹配的运费规则");
      }
      setLoading(false);
    }, 500);
  };

  return (
    <>
      <div
        className='app-container'
        style={{
          backgroundColor: currentView === "calculator" ? "#fff" : undefined,
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}>
          <Title level={2} className='app-title' style={{ margin: 0 }}>
            {currentView === "calculator" ? "运费计算器" : "数据管理"}
          </Title>
          {currentView === "importer" && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              size='small'>
              下载模版
            </Button>
          )}
        </div>

        {currentView === "calculator" ? (
          <Card variant='borderless' style={{ flex: 1 }}>
            <Form
              form={form}
              layout='vertical'
              onFinish={onFinish}
              size='large'>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label='始发地'
                    name='origin'
                    rules={[{ required: true, message: "请选择始发地" }]}>
                    <Select
                      placeholder='选择始发地'
                      showSearch
                      allowClear
                      options={originOptions.map((o) => ({
                        label: o,
                        value: o,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label='目的地'
                    name='destination'
                    rules={[{ required: true, message: "请选择目的地" }]}>
                    <Select
                      placeholder='选择目的地'
                      showSearch
                      allowClear
                      options={destOptions.map((d) => ({
                        label: d,
                        value: d,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label='重量 (kg)'
                name='weight'
                rules={[{ required: true, message: "请输入或选择重量" }]}>
                {weightOptions.length > 0 ? (
                  <Select
                    placeholder='选择重量'
                    showSearch
                    allowClear
                    options={weightOptions.map((w) => ({
                      label: `${w} kg`,
                      value: w,
                    }))}
                  />
                ) : (
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    step={0.1}
                    placeholder='请输入数值'
                  />
                )}
              </Form.Item>

              <Form.Item>
                <Button
                  type='primary'
                  htmlType='submit'
                  icon={<SearchOutlined />}
                  block
                  loading={loading}
                  disabled={rules.length === 0}>
                  查询金额
                </Button>
                {rules.length === 0 && (
                  <Text
                    type='secondary'
                    style={{
                      display: "block",
                      marginTop: 8,
                      textAlign: "center",
                    }}>
                    请先导入数据
                  </Text>
                )}
              </Form.Item>
            </Form>

            {calculatedPrice !== null && (
              <Card
                style={{
                  background: "#f6ffed",
                  borderColor: "#b7eb8f",
                  marginTop: "24px",
                  textAlign: "center",
                }}>
                <Statistic
                  title='预估运费（含卸货+操作费）'
                  value={calculatedPrice}
                  precision={2}
                  valueStyle={{ color: "#3f8600" }}
                  prefix={<DollarOutlined />}
                  suffix='元'
                />
              </Card>
            )}
          </Card>
        ) : (
          <Card
            variant='borderless'
            style={{ flex: 1, maxWidth: "100%", overflow: "hidden" }}>
            <Alert
              title='数据源'
              description={
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    wordBreak: "break-all",
                  }}>
                  <span>{dataMsg}</span>
                  {isCustomData && (
                    <Button
                      type='link'
                      size='small'
                      onClick={handleResetData}
                      style={{
                        padding: 0,
                        height: "auto",
                        textAlign: "left",
                        width: "fit-content",
                      }}>
                      重置为默认数据
                    </Button>
                  )}
                </div>
              }
              type={dataLoaded ? "success" : "warning"}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Dragger
              accept='.xlsx, .xls'
              beforeUpload={handleFileUpload}
              showUploadList={false}
              className='custom-dragger'>
              <p className='ant-upload-drag-icon'>
                <InboxOutlined />
              </p>
              <p className='ant-upload-text'>点击或拖拽 Excel 文件上传</p>
            </Dragger>

            {rules.length > 0 && (
              <div style={{ marginTop: "24px", overflowX: "auto" }}>
                <Text strong>已加载 {rules.length} 条数据 (预览前5条):</Text>
                <Table
                  dataSource={rules
                    .slice(0, 5)
                    .map((r) => ({ ...r.rawData, key: r.key }))}
                  columns={columns}
                  pagination={false}
                  size='small'
                  scroll={{ x: "max-content" }}
                  style={{ marginTop: "12px" }}
                />
              </div>
            )}
          </Card>
        )}
        {/* 底部占位符，防止内容被遮挡 */}
        <div style={{ height: "80px" }} />
      </div>

      {/* 底部导航栏 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          margin: "0 auto",
          width: "100%",
          maxWidth: "430px",
          backgroundColor: "#fff",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "8px 0",
          zIndex: 9999,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        }}>
        <div
          onClick={() => setCurrentView("calculator")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color:
              currentView === "calculator" ? "#1677ff" : "rgba(0, 0, 0, 0.45)",
            cursor: "pointer",
            flex: 1,
          }}>
          <CalculatorOutlined style={{ fontSize: "24px" }} />
          <span style={{ fontSize: "12px", marginTop: "4px" }}>运费计算</span>
        </div>
        <div
          onClick={() => setCurrentView("importer")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color:
              currentView === "importer" ? "#1677ff" : "rgba(0, 0, 0, 0.45)",
            cursor: "pointer",
            flex: 1,
          }}>
          <DatabaseOutlined style={{ fontSize: "24px" }} />
          <span style={{ fontSize: "12px", marginTop: "4px" }}>数据管理</span>
        </div>
      </div>
    </>
  );
};

export default App;
