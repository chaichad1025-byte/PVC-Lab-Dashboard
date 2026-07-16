/* =========================================================
   LAB PRODUCTION DASHBOARD
   SCRIPT.JS
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const API_URL =
    "https://script.google.com/macros/s/AKfycbw1ku48HDlJOTtaPknDR7He0_BPZgzd4xOl4pG8k9Imb7TKdpafJtkyum8KHADwJfVz/exec";

const REFRESH_INTERVAL =
    5000;


/*
IMPORTANT

ถ้าชื่อเครื่องจริงของ LAB ไม่ตรงกับรายการนี้
แก้เฉพาะ MACHINE_LIST ได้เลย

ตัวอย่าง:
const MACHINE_LIST = [];
*/

const MACHINE_LIST = [];


const TROUBLE_STATUS = [

    "ล่าช้ากว่ากำหนด",
    "เหตุขัดข้องใส่สีผิด",
    "ชั่งน้ำหนักผิด",
    "Standardผิด",
    "สูตรCompoundผิด"

];


const ACTIVE_STATUS = [

    "กำลังดำเนินงาน",
    ...TROUBLE_STATUS

];


/* =========================================================
   GLOBAL STATE
========================================================= */

let dashboardData = {

    queue: [],
    finished: [],
    trouble: []

};


let selectedActiveOrder = "";

let productionOutputChart = null;

let refreshTimer = null;

let isLoading = false;


/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initializeLogin();

    }

);


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const clock =
        document.getElementById("clock");

    if (!clock) return;

    const now =
        new Date();

    clock.textContent =
        now.toLocaleTimeString(
            "th-TH",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    false
            }
        );

}


/* =========================================================
   AUTO REFRESH
========================================================= */
function startAutoRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

    }


    refreshTimer =
        setInterval(

            () => {

                // ดึงข้อมูลใหม่จาก API จริง
                // ทุก 5 วินาที

                loadDashboardData(
                    true
                );

            },

            REFRESH_INTERVAL

        );

}


/* =========================================================
   EVENT BINDING
========================================================= */

function bindEvents() {


    /* CURRENT PRODUCTION DROPDOWN */

    const activeOrderSelect =
        document.getElementById(
            "activeOrderSelect"
        );

    if (activeOrderSelect) {

        activeOrderSelect.addEventListener(

            "change",

            event => {

                selectedActiveOrder =
                    event.target.value;

                renderCurrentProduction();

            }

        );

    }


    /* QUICK FILTER BUTTONS */

    document
        .querySelectorAll(
            ".filter-button"
        )
        .forEach(

            button => {

                button.addEventListener(

                    "click",

                    () => {

                        const report =
                            button.dataset.report;

                        const range =
                            button.dataset.range;

                        applyQuickRange(
                            report,
                            range
                        );

                    }

                );

            }

        );


    /* PRODUCTION OUTPUT */

    bindButton(

        "searchOutputButton",

        renderProductionOutput

    );


    bindButton(

        "resetOutputButton",

        () => {

            resetReportFilter(
                "output"
            );

            renderProductionOutput();

        }

    );


    bindButton(

        "saveOutputButton",

        () => {

            saveSectionAsImage(

                "productionOutputExport",

                "Production_Output"

            );

        }

    );


    /* TROUBLE HISTORY */

    bindButton(

        "searchTroubleButton",

        renderTroubleHistory

    );
    /* =====================================================
    ORDER SEARCH INPUT
    ===================================================== */

    const troubleOrderSearch =
        document.getElementById(
            "troubleOrderSearch"
        );

    if (troubleOrderSearch) {

       troubleOrderSearch.addEventListener(

            "keydown",

            event => {

                if (event.key === "Enter") {

                   renderTroubleHistory();

                }

            }

        );

    }


    const finishedOrderSearch =
        document.getElementById(
            "finishedOrderSearch"
        );

    if (finishedOrderSearch) {

       finishedOrderSearch.addEventListener(

           "keydown",

           event => {

               if (event.key === "Enter") {

                  renderFinishedOrders();

                }

            }

        );

    }


    bindButton(

        "resetTroubleButton",

        () => {

            resetReportFilter(
                "trouble"
            );

            renderTroubleHistory();

        }

    );


    bindButton(

        "saveTroubleButton",

        () => {

            saveSectionAsImage(

                "troubleHistoryExport",

                "Trouble_History"

            );

        }

    );


    /* FINISHED ORDER */

    bindButton(

        "searchFinishedButton",

        renderFinishedOrders

    );


    bindButton(

        "resetFinishedButton",

        () => {

            resetReportFilter(
                "finished"
            );

            renderFinishedOrders();

        }

    );


    bindButton(

        "saveFinishedButton",

        () => {

            saveSectionAsImage(

                "finishedOrderExport",

                "Finished_Order"

            );

        }

    );

}


function bindButton(
    id,
    handler
) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.addEventListener(
        "click",
        handler
    );

}


/* =========================================================
   LOAD API DATA
========================================================= */

async function loadDashboardData(
    silent = false
) {

    // ป้องกัน request ซ้อนกัน
    if (isLoading) {

        return;

    }

    isLoading =
        true;


    // ถ้ากด Refresh เอง
    // แสดงสถานะกำลังโหลด
    if (!silent) {

        setRefreshState(
            true
        );

    }


    try {

        // เพิ่ม timestamp ทุกครั้ง
        // เพื่อป้องกัน Browser / CDN Cache
        const requestUrl =
            API_URL +
            "?t=" +
            Date.now();


        const response =
            await fetch(

                requestUrl,

                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }

            );


        if (!response.ok) {

            throw new Error(

                "HTTP ERROR " +
                response.status

            );

        }


        const json =
            await response.json();


        console.log(
            "API RESPONSE:",
            json
        );


        // แปลง API ใหม่
        // data + finish + trouble

        const normalized =
            normalizeApiResponse(
                json
            );


        // เก็บข้อมูลล่าสุดทั้งหมด

        dashboardData =
            normalized;


        console.log(
            "DASHBOARD DATA:",
            dashboardData
        );


        // Render ทุกส่วนใหม่
        // โดยไม่ Reset Filter วันที่

        renderDashboard();


        // อัปเดตเวลา Refresh ล่าสุด

        updateLastUpdatedTime();


    } catch (error) {

        console.error(
            "LOAD DASHBOARD ERROR:",
            error
        );


        if (!silent) {

            showDashboardError(
                error.message
            );

        }

    } finally {

        isLoading =
            false;


        if (!silent) {

            setRefreshState(
                false
            );

        }

    }

}


/* =========================================================
   NORMALIZE API RESPONSE
========================================================= */
function normalizeApiResponse(response) {

    const queue =
        Array.isArray(response?.data)
            ? response.data
            : [];

    const finished =
        Array.isArray(response?.finish)
            ? response.finish
            : [];

    const trouble =
        Array.isArray(response?.trouble)
            ? response.trouble
            : [];

    return {

        queue:
            queue.map(
                normalizeOrder
            ),

        finished:
            finished.map(
                normalizeOrder
            ),

        trouble:
            trouble.map(
                normalizeTrouble
            )

    };

}

/* =========================================================
   NORMALIZE ORDER
========================================================= */

function normalizeOrder(
    raw = {}
) {

    return {

        queue:
            pick(
                raw,
                [
                    "queue",
                    "queueNo",
                    "queueNumber",
                    "QUEUE"
                ]
            ),

        orderNo:
            pick(
                raw,
                [
                    "orderNo",
                    "order",
                    "orderNumber",
                    "ORDER NO",
                    "ORDER_NO"
                ]
            ),

        jobType:
            normalizeJobType(

                pick(
                    raw,
                    [
                        "jobType",
                        "type",
                        "orderType",
                        "addType",
                        "TYPE"
                    ]
                )

            ),

        requester:
            pick(
                raw,
                [
                    "requester",
                    "requestedBy",
                    "requestBy",
                    "REQUESTER"
                ]
            ),

        customer:
            pick(
                raw,
                [
                    "customer",
                    "customerName",
                    "CUSTOMER"
                ]
            ),

        acknowledge:
            pick(
                raw,
                [
                    "acknowledge",
                    "ack",
                    "ACKNOWLEDGE"
                ]
            ),

        sheetType:
            pick(
                raw,
                [
                    "sheetType",
                    "sheet",
                    "SHEET TYPE"
                ]
            ),

        fabric:
            pick(
                raw,
                [
                    "fabric",
                    "fabricType",
                    "FABRIC"
                ]
            ),

        color:
            pick(
                raw,
                [
                    "color",
                    "colour",
                    "COLOR"
                ]
            ),

        thickness:
            pick(
                raw,
                [
                    "thickness",
                    "THICKNESS"
                ]
            ),

        width:
            pick(
                raw,
                [
                    "width",
                    "WIDTH"
                ]
            ),

        gsm:
            pick(
                raw,
                [
                    "gsm",
                    "GSM"
                ]
            ),

        weight:
            toNumber(

                pick(
                    raw,
                    [
                        "kg",
                        "weight",
                        "totalWeight",
                        "WEIGHT"
                    ]
                )

            ),

        machine:
            pick(
                raw,
                [
                    "machine",
                    "machines",
                    "machineName",
                    "MACHINE"
                ]
            ),

        batch:
            pick(
                raw,
                [
                    "batch",
                    "batchCount",
                    "productionBatch",
                    "BATCH"
                ]
            ),

        forecast:
            pick(
                raw,
                [
                    "forecast",
                    "forecastText",
                    "productionTime",
                    "FORECAST"
                ]
            ),

        startDate:
            pick(
                raw,
                [
                    "startDate",
                    "start",
                    "productionStart",
                    "START"
                ]
            ),

        dueDate:
            pick(
                raw,
                [
                    "dueDate",
                    "expectedFinish",
                    "finishForecast",
                    "DUE"
                ]
            ),

        status:
            getStatus(
                raw
            ),

        troubleStart:
            pick(
                raw,
                [
                    "troubleStart",
                    "problemStart",
                    "TROUBLE START"
                ]
            ),

        troubleTime:
            pick(
                raw,
                [
                    "troubleTime",
                    "totalTrouble",
                    "downtime",
                    "TROUBLE TIME"
                ]
            ),

        finishDate:
            pick(
                raw,
                [
                    "finishDate",
                    "finishedDate",
                    "doneDate",
                    "FINISHED"
                ]
            ),

        actualTime:
            pick(
                raw,
                [
                    "actualTime",
                    "totalTime",
                    "usedTime",
                    "ACTUAL TIME"
                ]
            ),

        remark:
            pick(
                raw,
                [
                    "remark",
                    "remarks",
                    "note",
                    "REMARK"
                ]
            )

    };

}


/* =========================================================
   NORMALIZE TROUBLE
========================================================= */

function normalizeTrouble(
    raw = {}
) {

    return {

        // A = เวลาเริ่มขัดข้อง
        start:
            raw.start || "",

        // B = เวลาสิ้นสุด
        end:
            raw.end || "",

        // C = เวลาที่ใช้
        duration:
            raw.duration || "",

        // D = ประเภทงาน
        jobType:
            normalizeJobType(
                raw.jobType
            ),

        // E = สาเหตุ REWORK
        reworkReason:
            raw.reworkReason || "",

        // F = ประเภทปัญหา
        // หน้า Dashboard เดิมใช้ชื่อ trouble
        trouble:
            raw.status || "",

        // G = หมายเหตุ
        remark:
            raw.remark || "",

        // H = ORDER
        orderNo:
            raw.orderNo || "",

        // I = ผู้สั่ง ORDER
        requester:
            raw.requester || "",

        // J = รับทราบ ORDER
        acknowledge:
            raw.acknowledge || "",

        // K = ลูกค้า
        customer:
            raw.customer || "",

        // L = ประเภทชีท
        sheetType:
            raw.sheetType || "",

        // M = เบอร์ผ้า
        fabric:
            raw.fabric || "",

        // N = สี
        color:
            raw.color || "",

        // O = ความหนา
        thickness:
            raw.thickness || "",

        // P = หน้ากว้าง
        width:
            raw.width || "",

        // Q = น้ำหนัก g/m²
        gsm:
            raw.gsm || "",

        // R = เครื่องผสมสี
        machine:
            raw.machine || "",

        // S = จำนวน Kg
        weight:
            toNumber(
                raw.kg
            )

    };

}

/* =========================================================
   PICK PROPERTY
========================================================= */

function pick(
    object,
    keys
) {

    for (
        const key
        of keys
    ) {

        if (
            object[key] !== undefined &&
            object[key] !== null &&
            String(object[key]).trim() !== ""
        ) {

            return object[key];

        }

    }

    return "";

}


/* =========================================================
   STATUS
========================================================= */

function getStatus(
    item
) {

    return String(

        pick(
            item,
            [
                "status",
                "STATUS",
                "productionStatus"
            ]
        ) || ""

    ).trim();

}


/* =========================================================
   JOB TYPE
========================================================= */

function normalizeJobType(
    value
) {

    const text =
        String(
            value || ""
        )
        .trim()
        .toLowerCase();


    if (
        text.includes(
            "rework"
        ) ||
        text.includes(
            "แก้"
        ) ||
        text.includes(
            "รีเวิร์ค"
        )
    ) {

        return "REWORK";

    }


    if (
        text.includes(
            "normal"
        ) ||
        text.includes(
            "ปกติ"
        )
    ) {

        return "NORMAL";

    }


    return text
        ? String(value)
        : "NORMAL";

}


/* =========================================================
   RENDER WHOLE DASHBOARD
========================================================= */

function renderDashboard() {

    renderQueue();

    renderKPI();

    renderActiveOrderDropdown();

    renderCurrentProduction();

    renderLatestFinished();

    renderMachineStatus();


    /*
    Report ที่ผู้ใช้เลือกไว้
    อัปเดตตามข้อมูล realtime ด้วย
    */

    renderProductionOutput();

    renderTroubleHistory();

    renderFinishedOrders();

}


/* =========================================================
   QUEUE TABLE
========================================================= */

function renderQueue() {

    const body =
        document.getElementById(
            "queueBody"
        );


    const count =
        document.getElementById(
            "queueCount"
        );


    if (!body) return;


    const orders =
        [...dashboardData.queue]
        .filter(

            order =>

                order.status !==
                "เสร็จสิ้น"

        );


    if (count) {

        count.textContent =

            orders.length +
            " ORDERS";

    }


    if (
        orders.length === 0
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="table-message"
                >

                    ไม่มี Order ใน Queue

                </td>

            </tr>

        `;

        return;

    }


    body.innerHTML =
        orders
        .map(

            order => `

                <tr>

                    <td>

                        <span class="queue-number">

                            ${escapeHtml(
                                displayValue(
                                    order.queue
                                )
                            )}

                        </span>

                    </td>


                    <td>

                        ${createStatusBadge(
                            order.status
                        )}

                    </td>


                    <td>

                        <span class="order-number">

                            ${escapeHtml(
                                displayValue(
                                    order.orderNo
                                )
                            )}

                        </span>

                    </td>


                    <td>

                        ${createTypeBadge(
                            order.jobType
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.requester
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.customer
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.fabric
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.color
                            )
                        )}

                    </td>


                    <td class="machine-cell">

                        ${escapeHtml(
                            displayValue(
                                order.machine
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.batch
                            )
                        )}

                    </td>


                    <td class="weight-cell">

                        ${formatNumber(
                            order.weight
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.forecast
                            )
                        )}

                    </td>

                </tr>

            `

        )
        .join("");

}


/* =========================================================
   KPI
========================================================= */

function renderKPI() {

    const activeOrders =
        dashboardData.queue.filter(

            order =>

                ACTIVE_STATUS.includes(
                    order.status
                )

        );


    const waitingOrders =
        dashboardData.queue.filter(

            order =>

                order.status ===
                "รอคิว"

        );


    const totalWeight =
        dashboardData.queue.reduce(

            (
                sum,
                order
            ) =>

                sum +
                toNumber(
                    order.weight
                ),

            0

        );


    const latest =
        getLatestFinishedOrder();


    /* =====================================================
       KPI CARDS
    ===================================================== */

    setText(
        "kpiRunning",
        activeOrders.length
    );


    setText(
        "kpiWaiting",
        waitingOrders.length
    );


    setText(
        "kpiTotalWeight",
        formatNumber(
            totalWeight
        )
    );


    setText(

        "kpiLatestFinishedWeight",

        latest
            ? formatNumber(
                latest.weight
            )
            : "—"

    );


    /* =====================================================
       QUEUE TABLE HEADER SUMMARY
    ===================================================== */

    setText(
        "queueHeaderRunning",
        activeOrders.length
    );


    setText(
        "queueHeaderWaiting",
        waitingOrders.length
    );


    setText(

        "queueHeaderWeight",

        `${formatNumber(
            totalWeight
        )} KG`

    );

}


/* =========================================================
   ACTIVE ORDER DROPDOWN
========================================================= */

function getActiveOrders() {

    return dashboardData.queue.filter(

        order =>

            ACTIVE_STATUS.includes(
                order.status
            )

    );

}


function renderActiveOrderDropdown() {

    const select =
        document.getElementById(
            "activeOrderSelect"
        );


    if (!select) return;


    const activeOrders =
        getActiveOrders();


    /*
    เก็บ Order ที่ผู้ใช้กำลังเลือกไว้
    */

    const previousSelection =

        selectedActiveOrder ||

        select.value;


    if (
        activeOrders.length === 0
    ) {

        select.innerHTML = `

            <option value="">

                No active order

            </option>

        `;


        selectedActiveOrder =
            "";

        return;

    }


    select.innerHTML =
        activeOrders
        .map(

            order => {

                const label =

                    displayValue(
                        order.orderNo
                    ) +

                    " · " +

                    displayValue(
                        order.status
                    );


                return `

                    <option
                        value="${escapeAttribute(
                            order.orderNo
                        )}"
                    >

                        ${escapeHtml(
                            label
                        )}

                    </option>

                `;

            }

        )
        .join("");


    const stillExists =
        activeOrders.some(

            order =>

                String(
                    order.orderNo
                ) ===

                String(
                    previousSelection
                )

        );


    if (stillExists) {

        selectedActiveOrder =
            previousSelection;

    }

    else {

        selectedActiveOrder =
            activeOrders[0].orderNo;

    }


    select.value =
        selectedActiveOrder;

}


/* =========================================================
   CURRENT PRODUCTION
========================================================= */

function renderCurrentProduction() {

    const activeOrders =
        getActiveOrders();


    let order =
        activeOrders.find(

            item =>

                String(
                    item.orderNo
                ) ===

                String(
                    selectedActiveOrder
                )

        );


    if (!order) {

        order =
            activeOrders[0];

    }


    if (!order) {

        clearCurrentProduction();

        return;

    }


    selectedActiveOrder =
        order.orderNo;


    setText(
        "activeOrderNo",
        displayValue(
            order.orderNo
        )
    );


    setText(
        "activeQueue",
        displayValue(
            order.queue
        )
    );


    setText(
        "activeRequester",
        displayValue(
            order.requester
        )
    );


    setText(
        "activeCustomer",
        displayValue(
            order.customer
        )
    );


    setText(
        "activeAcknowledge",
        displayValue(
            order.acknowledge
        )
    );


    setText(
        "activeSheetType",
        displayValue(
            order.sheetType
        )
    );


    setText(
        "activeFabric",
        displayValue(
            order.fabric
        )
    );


    setText(
        "activeColor",
        displayValue(
            order.color
        )
    );


    setText(
        "activeThickness",
        displayValue(
            order.thickness
        )
    );


    setText(
        "activeWidth",
        displayValue(
            order.width
        )
    );


    setText(
        "activeGsm",
        displayValue(
            order.gsm
        )
    );


    setText(

        "activeWeight",

        order.weight !== undefined &&
        order.weight !== null

            ? formatNumber(
                order.weight
            ) + " kg"
            : "—"

    );


    setText(
        "activeMachine",
        displayValue(
            order.machine
        )
    );


    setText(
        "activeBatch",
        displayValue(
            order.batch
        )
    );


    setText(
        "activeForecast",
        displayValue(
            order.forecast
        )
    );


    setText(

        "activeStartDate",

        formatThaiDateTime(
            order.startDate
        )

    );


    setText(

        "activeDueDate",

        formatThaiDateTime(
            order.dueDate
        )

    );


    renderCurrentOrderBadges(
        order
    );


    updateCurrentProductionTime(
        order
    );


    renderCurrentTrouble(
        order
    );

}


/* =========================================================
   CURRENT ORDER BADGES
========================================================= */

function renderCurrentOrderBadges(
    order
) {

    const container =
        document.getElementById(
            "activeOrderBadges"
        );


    if (!container) return;


    container.innerHTML =

        createTypeBadge(
            order.jobType
        ) +

        createStatusBadge(
            order.status
        );

}


/* =========================================================
   CURRENT PRODUCTION TIME
========================================================= */

function updateCurrentProductionTime(
    order
) {

    const start =
        parseDate(
            order.startDate
        );


    const due =
        parseDate(
            order.dueDate
        );


    const now =
        new Date();


    if (!start) {

        setText(
            "elapsedTime",
            "00:00:00"
        );


        setText(
            "countdownTime",
            "—"
        );


        setProgress(
            0
        );


        return;

    }


    const elapsedMs =
        Math.max(
            0,
            now - start
        );


    setText(

        "elapsedTime",

        formatDurationClock(
            elapsedMs
        )

    );


    if (!due) {

        setText(
            "countdownTime",
            "—"
        );


        setProgress(
            0
        );


        return;

    }


    const totalMs =
        due - start;


    const remainingMs =
        due - now;


    if (
        remainingMs >= 0
    ) {

        setText(

            "countdownTime",

            formatDurationClock(
                remainingMs
            )

        );

    }

    else {

        setText(

            "countdownTime",

            "OVER " +
            formatDurationClock(
                Math.abs(
                    remainingMs
                )
            )

        );

    }


    const progress =

        totalMs > 0

            ? (
                elapsedMs /
                totalMs
            ) * 100

            : 0;


    setProgress(

        Math.min(
            100,
            Math.max(
                0,
                progress
            )
        )

    );

}


/* =========================================================
   PROGRESS
========================================================= */

function setProgress(
    value
) {

    const percent =
        Math.round(
            value
        );


    setText(

        "progressPercent",

        percent + "%"

    );


    const fill =
        document.getElementById(
            "progressFill"
        );


    if (fill) {

        fill.style.width =
            percent + "%";

    }

}


/* =========================================================
   CURRENT TROUBLE
========================================================= */

function renderCurrentTrouble(
    order
) {

    const box =
        document.getElementById(
            "activeTroubleBox"
        );


    if (!box) return;


    const isTrouble =
        TROUBLE_STATUS.includes(
            order.status
        );


    if (!isTrouble) {

        box.hidden =
            true;

        return;

    }


    box.hidden =
        false;


    setText(
        "activeTroubleStatus",
        order.status
    );


    setText(

        "activeTroubleStart",

        formatThaiDateTime(
            order.troubleStart
        )

    );


    setText(

        "activeTroubleTotal",

        displayValue(
            order.troubleTime
        )

    );


    setText(

        "activeTroubleRemark",

        displayValue(
            order.remark
        )

    );
}


/* =========================================================
   CLEAR CURRENT PRODUCTION
========================================================= */

function clearCurrentProduction() {

    const ids = [

        "activeOrderNo",
        "activeQueue",
        "activeRequester",
        "activeCustomer",
        "activeAcknowledge",
        "activeSheetType",
        "activeFabric",
        "activeColor",
        "activeThickness",
        "activeWidth",
        "activeGsm",
        "activeWeight",
        "activeMachine",
        "activeBatch",
        "activeForecast",
        "activeStartDate",
        "activeDueDate"

    ];


    ids.forEach(

        id =>

            setText(
                id,
                "—"
            )

    );


    setText(
        "elapsedTime",
        "00:00:00"
    );


    setText(
        "countdownTime",
        "—"
    );


    setProgress(
        0
    );


    const badges =
        document.getElementById(
            "activeOrderBadges"
        );


    if (badges) {

        badges.innerHTML =

            createTypeBadge(
                ""
            );

    }


    const trouble =
        document.getElementById(
            "activeTroubleBox"
        );


    if (trouble) {

        trouble.hidden =
            true;

    }

}


/* =========================================================
   UPDATE CURRENT TIMER EVERY SECOND
========================================================= */

setInterval(

    () => {

        const activeOrders =
            getActiveOrders();


        const order =
            activeOrders.find(

                item =>

                    String(
                        item.orderNo
                    ) ===

                    String(
                        selectedActiveOrder
                    )

            );


        if (order) {

            updateCurrentProductionTime(
                order
            );

        }

    },

    1000

);


/* =========================================================
   LATEST FINISHED
========================================================= */

function getLatestFinishedOrder() {

    const orders =
        [...dashboardData.finished];


    if (
        orders.length === 0
    ) {

        return null;

    }


    orders.sort(

        (
            a,
            b
        ) => {

            const dateA =
                parseDate(
                    a.finishDate
                );


            const dateB =
                parseDate(
                    b.finishDate
                );


            return (

                (
                    dateB
                        ? dateB.getTime()
                        : 0
                )

                -

                (
                    dateA
                        ? dateA.getTime()
                        : 0
                )

            );

        }

    );


    return orders[0];

}


/* =========================================================
   RENDER LATEST FINISHED
========================================================= */

function renderLatestFinished() {

    const order =
        getLatestFinishedOrder();


    if (!order) {

        return;

    }


    setText(
        "finishQueue",
        displayValue(
            order.queue
        )
    );


    setText(
        "finishOrderNo",
        displayValue(
            order.orderNo
        )
    );


    setText(
        "finishJobType",
        displayValue(
            order.jobType
        )
    );


    setText(
        "finishRequester",
        displayValue(
            order.requester
        )
    );


    setText(
        "finishCustomer",
        displayValue(
            order.customer
        )
    );

    setText(
        "finishAcknowledge",
        displayValue(
            order.acknowledge
        )
    );


    setText(
        "finishSheetType",
        displayValue(
            order.sheetType
        )
    );


    setText(
        "finishFabric",
        displayValue(
            order.fabric
        )
    );


    setText(
        "finishColor",
        displayValue(
            order.color
        )
    );


    setText(
        "finishThickness",
        displayValue(
            order.thickness
        )
    );


    setText(
        "finishWidth",
        displayValue(
            order.width
        )
    );


    setText(
        "finishGsm",
        displayValue(
            order.gsm
        )
    );


    setText(
        "finishMachine",
        displayValue(
            order.machine
        )
    );


    setText(
        "finishBatch",
        displayValue(
            order.batch
        )
    );


    setText(

        "finishWeight",

        order.weight !== undefined &&
        order.weight !== null
            ? formatNumber(
                order.weight
            ) + " kg"
            : "—"

    );


    setText(
        "finishForecast",
        displayValue(
            order.forecast
        )
    );


    setText(
        "finishActualTime",
        displayValue(
            order.actualTime
        )
    );


    setText(
        "finishTroubleTime",
        displayValue(
            order.troubleTime
        )
    );


    setText(

        "finishStartDate",

        formatThaiDateTime(
            order.startDate
        )

    );


    setText(

        "finishDoneDate",

        formatThaiDateTime(
            order.finishDate
        )

    );


    setText(
        "finishRemark",
        displayValue(
            order.remark
        )
    );

}

/* =========================================================
   GET MACHINE NAMES
========================================================= */

function getMachineNames() {

    return [
        "Mixer1000-1",
        "Mixer1000-2",
        "Mixer250-1",
        "Mixer250-2",
        "Mixer250-3",
        "Mixer250-4"
    ];

}
/* =========================================================
   SPLIT MACHINE NAMES
========================================================= */

function splitMachines(
    machineValue
) {

    if (
        machineValue === null ||
        machineValue === undefined ||
        String(machineValue).trim() === ""
    ) {

        return [];

    }


    return String(
        machineValue
    )
        .split(",")
        .map(
            machine =>
                machine.trim()
        )
        .filter(
            machine =>
                machine !== ""
        );

}
/* =========================================================
   MACHINE STATUS
========================================================= */

function renderMachineStatus() {

    const grid1000 =
        document.getElementById(
            "machineGrid1000"
        );

    const grid250 =
        document.getElementById(
            "machineGrid250"
        );


    if (
        !grid1000 ||
        !grid250
    ) {

        return;

    }


    const activeOrders =
        getActiveOrders();


    const machineNames =
        getMachineNames(
            activeOrders
        );


    // =========================================
    // แยกเครื่อง 1000 KG
    // =========================================

    const machines1000 =
        machineNames
            .filter(

                machine =>

                    String(machine)
                        .toLowerCase()
                        .includes("1000")

            )
            .sort(
                sortMachineByNumber
            );


    // =========================================
    // แยกเครื่อง 250 KG
    // =========================================

    const machines250 =
        machineNames
            .filter(

                machine =>

                    String(machine)
                        .toLowerCase()
                        .includes("250")

            )
            .sort(
                sortMachineByNumber
            );


    // =========================================
    // RENDER 1000 KG
    // =========================================

    grid1000.innerHTML =
        createMachineCardsHtml(
            machines1000,
            activeOrders
        );


    // =========================================
    // RENDER 250 KG
    // =========================================

    grid250.innerHTML =
        createMachineCardsHtml(
            machines250,
            activeOrders
        );

}


/* =========================================================
   CREATE MACHINE CARDS HTML
========================================================= */

function createMachineCardsHtml(
    machineNames,
    activeOrders
) {

    if (
        machineNames.length === 0
    ) {

        return `

            <div class="machine-loading">

                ไม่พบข้อมูลเครื่อง

            </div>

        `;

    }


    return machineNames
        .map(

            machine => {

                const order =
                    activeOrders.find(

                        item =>

                            splitMachines(
                                item.machine
                            )
                            .includes(
                                machine
                            )

                    );


                let state =
                    "free";


                let stateText =
                    "ว่าง";


                if (order) {

                    if (
                        TROUBLE_STATUS.includes(
                            order.status
                        )
                    ) {

                        state =
                            "trouble";

                        stateText =
                            "ขัดข้อง";

                    }

                    else {

                        state =
                            "running";

                        stateText =
                            "กำลังใช้งาน";

                    }

                }


                return `

                    <article
                        class="
                            machine-card
                            machine-${state}
                        "
                    >

                        <div class="machine-card-header">

                            <strong class="machine-name">

                                ${escapeHtml(
                                    machine
                                )}

                            </strong>


                            <span class="machine-state">

                                ${escapeHtml(
                                    stateText
                                )}

                            </span>

                        </div>


                        <div class="machine-info">

                            <div class="machine-info-row">

                                <span>
                                    Order
                                </span>

                                <strong>

                                    ${escapeHtml(

                                        order
                                            ? displayValue(
                                                order.orderNo
                                            )
                                            : "—"

                                    )}

                                </strong>

                            </div>


                            <div class="machine-info-row">

                                <span>
                                    Type
                                </span>

                                <strong>

                                    ${escapeHtml(

                                        order
                                            ? displayValue(
                                                order.jobType
                                            )
                                            : "—"

                                    )}

                                </strong>

                            </div>


                            <div class="machine-info-row">

                                <span>
                                    Status
                                </span>

                                <strong>

                                    ${escapeHtml(

                                        order
                                            ? displayValue(
                                                order.status
                                            )
                                            : "พร้อมใช้งาน"

                                    )}

                                </strong>

                            </div>

                        </div>

                    </article>

                `;

            }

        )
        .join("");

}


/* =========================================================
   SORT MACHINE BY NUMBER
========================================================= */

function sortMachineByNumber(
    a,
    b
) {

    return String(a)
        .localeCompare(

            String(b),

            undefined,

            {
                numeric:
                    true,

                sensitivity:
                    "base"
            }

        );

}

/* =========================================================
   DEFAULT DATE RANGES
========================================================= */

function initializeDefaultDateRanges() {

    [
        "output",
        "trouble",
        "finished"
    ]
    .forEach(

        report => {

            setDateRange(
                report,
                "month"
            );

            setActiveFilterButton(
                report,
                "month"
            );

        }

    );

}


/* =========================================================
   QUICK DATE RANGE
========================================================= */

function applyQuickRange(
    report,
    range
) {

    setDateRange(
        report,
        range
    );


    setActiveFilterButton(
        report,
        range
    );


    // กดแล้วอัปเดต Report นั้นทันที

    if (
        report ===
        "output"
    ) {

        renderProductionOutput();

    }


    else if (
        report ===
        "trouble"
    ) {

        renderTroubleHistory();

    }


    else if (
        report ===
        "finished"
    ) {

        renderFinishedOrders();

    }

}
/* =========================================================
   SET DATE RANGE
========================================================= */

function setDateRange(
    report,
    range
) {

    const now =
        new Date();


    let start =
        new Date(
            now
        );


    let end =
        new Date(
            now
        );


    if (
        range ===
        "day"
    ) {

        start =
            startOfDay(
                now
            );


        end =
            endOfDay(
                now
            );

    }


    else if (
        range ===
        "week"
    ) {

        const day =
            now.getDay();


        const diffToMonday =

            day === 0

                ? -6

                : 1 - day;


        start =
            new Date(
                now
            );


        start.setDate(

            now.getDate() +
            diffToMonday

        );


        start =
            startOfDay(
                start
            );


        end =
            new Date(
                start
            );


        end.setDate(

            start.getDate() +
            6

        );


        end =
            endOfDay(
                end
            );

    }


    else {

        start =
            new Date(

                now.getFullYear(),

                now.getMonth(),

                1

            );


        end =
            new Date(

                now.getFullYear(),

                now.getMonth() + 1,

                0

            );


        end =
            endOfDay(
                end
            );

    }


    const ids =
        getReportDateIds(
            report
        );


    setInputValue(
        ids.start,
        toDateInputValue(
            start
        )
    );


    setInputValue(
        ids.end,
        toDateInputValue(
            end
        )
    );

}


/* =========================================================
   ACTIVE FILTER BUTTON
========================================================= */

function setActiveFilterButton(
    report,
    range
) {

    document
        .querySelectorAll(

            `.filter-button[
                data-report="${report}"
            ]`

        )
        .forEach(

            button => {

                button.classList.toggle(

                    "active",

                    button.dataset.range ===
                    range

                );

            }

        );

}

/* =========================================================
   RESET FILTER
========================================================= */

function resetReportFilter(
    report
) {

    setDateRange(
        report,
        "month"
    );


    setActiveFilterButton(
        report,
        "month"
    );


    /* ล้างช่องค้นหา Order */

    if (
        report ===
        "trouble"
    ) {

        setInputValue(
            "troubleOrderSearch",
            ""
        );

    }


    else if (
        report ===
        "finished"
    ) {

        setInputValue(
            "finishedOrderSearch",
            ""
        );

    }

}


/* =========================================================
   GET REPORT DATE IDS
========================================================= */

function getReportDateIds(
    report
) {

    const map = {

        output: {

            start:
                "outputStartDate",

            end:
                "outputEndDate"

        },


        trouble: {

            start:
                "troubleStartDate",

            end:
                "troubleEndDate"

        },


        finished: {

            start:
                "finishedStartDate",

            end:
                "finishedEndDate"

        }

    };


    return map[report];

}


/* =========================================================
   GET DATE RANGE
========================================================= */

function getSelectedDateRange(
    report
) {

    const ids =
        getReportDateIds(
            report
        );


    const startValue =
        getInputValue(
            ids.start
        );


    const endValue =
        getInputValue(
            ids.end
        );


    const start =
        startValue

            ? startOfDay(
                new Date(
                    startValue +
                    "T00:00:00"
                )
            )

            : null;


    const end =
        endValue

            ? endOfDay(
                new Date(
                    endValue +
                    "T00:00:00"
                )
            )

            : null;


    return {

        start,
        end

    };

}


/* =========================================================
   PRODUCTION OUTPUT
========================================================= */

function renderProductionOutput() {

    const range =
        getSelectedDateRange(
            "output"
        );


    const orders =
        dashboardData.finished.filter(

            order =>

                isDateInRange(

                    order.finishDate,

                    range.start,

                    range.end

                )

        );


    const totalWeight =
        orders.reduce(

            (
                sum,
                order
            ) =>

                sum +
                toNumber(
                    order.weight
                ),

            0

        );


    const normalCount =
        orders.filter(

            order =>

                order.jobType ===
                "NORMAL"

        ).length;


    const reworkCount =
        orders.filter(

            order =>

                order.jobType ===
                "REWORK"

        ).length;


    setText(
        "outputTotalOrders",
        orders.length
    );


    setText(

        "outputTotalWeight",

        formatNumber(
            totalWeight
        ) +
        " kg"

    );


    setText(
        "outputNormalOrders",
        normalCount
    );


    setText(
        "outputReworkOrders",
        reworkCount
    );


    setText(

        "outputRangeLabel",

        createRangeLabel(
            range.start,
            range.end
        )

    );


    renderProductionChart(
        orders
    );

}


/* =========================================================
   PRODUCTION CHART
========================================================= */

function renderProductionChart(
    orders
) {

    const canvas =
        document.getElementById(
            "productionOutputChart"
        );


    if (!canvas) return;


    const grouped =
        groupProductionByDate(
            orders
        );


    const labels =
        Object.keys(
            grouped
        )
        .sort();


    const weights =
        labels.map(

            date =>
                grouped[date].weight

        );


    const orderCounts =
        labels.map(

            date =>
                grouped[date].orders

        );


    if (
        productionOutputChart
    ) {

        productionOutputChart.destroy();

    }


    productionOutputChart =
        new Chart(

            canvas,

            {

                type:
                    "bar",


                data: {

                    labels:
                        labels.map(
                            formatChartDate
                        ),


                    datasets: [

                        {

                            label:
                                "Production Weight (kg)",

                            data:
                                weights,

                            yAxisID:
                                "y"

                        },

                        {

                            label:
                                "Finished Orders",

                            data:
                                orderCounts,

                            type:
                                "line",

                            yAxisID:
                                "y1",

                            tension:
                                0.25

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    plugins: {

                        legend: {

                            position:
                                "top"

                        },

                        tooltip: {

                            enabled:
                                true

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                maxRotation:
                                    45,

                                minRotation:
                                    0

                            }

                        },


                        y: {

                            beginAtZero:
                                true,

                            position:
                                "left",

                            title: {

                                display:
                                    true,

                                text:
                                    "Weight (kg)"

                            }

                        },


                        y1: {

                            beginAtZero:
                                true,

                            position:
                                "right",

                            grid: {

                                drawOnChartArea:
                                    false

                            },

                            ticks: {

                                precision:
                                    0

                            },

                            title: {

                                display:
                                    true,

                                text:
                                    "Orders"

                            }

                        }

                    }

                }

            }

        );

}


/* =========================================================
   GROUP PRODUCTION BY DATE
========================================================= */

function groupProductionByDate(
    orders
) {

    const result =
        {};


    orders.forEach(

        order => {

            const date =
                parseDate(
                    order.finishDate
                );


            if (!date) return;


            const key =
                toDateInputValue(
                    date
                );


            if (!result[key]) {

                result[key] = {

                    weight:
                        0,

                    orders:
                        0

                };

            }


            result[key].weight +=
                toNumber(
                    order.weight
                );


            result[key].orders +=
                1;

        }

    );


    return result;

}

/* =========================================================
   GET ORDER SEARCH VALUE
========================================================= */

function getOrderSearchValue(
    inputId
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {

        return "";

    }


    return String(
        input.value || ""
    )
    .trim()
    .toLowerCase();

}

/* =========================================================
   TROUBLE HISTORY
========================================================= */

function renderTroubleHistory() {

    const body =
        document.getElementById(
            "troubleHistoryBody"
        );


    if (!body) return;


    const range =
        getSelectedDateRange(
            "trouble"
        );


    const orderSearch =
        getOrderSearchValue(
            "troubleOrderSearch"
        );


    const rows =
        dashboardData.trouble.filter(

            item => {

                const matchDate =
                    isDateInRange(

                        item.start,

                        range.start,

                        range.end

                    );


                const orderNo =
                    String(
                        item.orderNo || ""
                    )
                    .trim()
                    .toLowerCase();


                const matchOrder =

                    orderSearch === "" ||

                    orderNo.includes(
                        orderSearch
                    );


                return (

                    matchDate &&
                    matchOrder

                );

            }

        );


    setText(

        "troubleRangeLabel",

        createRangeLabel(
            range.start,
            range.end
        )

    );


    setText(

        "troubleResultCount",

        rows.length +
        " RECORDS"

    );


    if (
        rows.length === 0
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="table-message"
                >

                    ไม่พบประวัติเหตุขัดข้องที่ตรงกับเงื่อนไข

                </td>

            </tr>

        `;

        return;

    }


    body.innerHTML =
        rows
        .map(

            item => `

                <tr>

                    <td>

                        ${escapeHtml(
                            formatThaiDateTime(
                                item.start
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            formatThaiDateTime(
                                item.end
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                item.duration
                            )
                        )}

                    </td>


                    <td>

                        ${createTypeBadge(
                            item.jobType
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                item.trouble
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                item.remark
                            )
                        )}

                    </td>


                    <td>

                        <span class="order-number">

                            ${escapeHtml(
                                displayValue(
                                    item.orderNo
                                )
                            )}

                        </span>

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                item.customer
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                item.machine
                            )
                        )}

                    </td>

                </tr>

            `

        )
        .join("");

}


/* =========================================================
   FINISHED ORDER SEARCH
========================================================= */

function renderFinishedOrders() {

    const body =
        document.getElementById(
            "finishedOrderBody"
        );


    if (!body) return;


    const range =
        getSelectedDateRange(
            "finished"
        );


    const orderSearch =
        getOrderSearchValue(
            "finishedOrderSearch"
        );


    const orders =
        dashboardData.finished.filter(

            order => {

                const matchDate =
                    isDateInRange(

                        order.finishDate,

                        range.start,

                        range.end

                    );


                const orderNo =
                    String(
                        order.orderNo || ""
                    )
                    .trim()
                    .toLowerCase();


                const matchOrder =

                    orderSearch === "" ||

                    orderNo.includes(
                        orderSearch
                    );


                return (

                    matchDate &&
                    matchOrder

                );

            }

        );


    setText(

        "finishedRangeLabel",

        createRangeLabel(
            range.start,
            range.end
        )

    );


    setText(

        "finishedResultCount",

        orders.length +
        " ORDERS"

    );


    if (
        orders.length === 0
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="14"
                    class="table-message"
                >

                    ไม่พบ Order ที่ตรงกับเงื่อนไข

                </td>

            </tr>

        `;

        return;

    }


    body.innerHTML =
        orders
        .map(

            order => `

                <tr>

                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.queue
                            )
                        )}

                    </td>


                    <td>

                        <span class="order-number">

                            ${escapeHtml(
                                displayValue(
                                    order.orderNo
                                )
                            )}

                        </span>

                    </td>


                    <td>

                        ${createTypeBadge(
                            order.jobType
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.requester
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.customer
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.machine
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.batch
                            )
                        )}

                    </td>


                    <td>

                        ${formatNumber(
                            order.weight
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.forecast
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.actualTime
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.troubleTime
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            formatThaiDateTime(
                                order.startDate
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            formatThaiDateTime(
                                order.finishDate
                            )
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            displayValue(
                                order.remark
                            )
                        )}

                    </td>

                </tr>

            `

        )
        .join("");

}


/* =========================================================
   SAVE ENTIRE SECTION AS IMAGE

   หลักการ:
   1. Clone Section
   2. เอา clone ไปไว้นอกหน้าจอ
   3. ขยาย Scroll Area ทั้งหมด
   4. Capture clone ทั้งหมด
   5. ลบ clone

   จึงไม่ขึ้นกับว่า User เลื่อนเห็นตรงไหน
========================================================= */

async function saveSectionAsImage(
    elementId,
    filePrefix
) {

    const source =
        document.getElementById(
            elementId
        );


    if (!source) {

        alert(
            "ไม่พบส่วนที่ต้องการบันทึก"
        );

        return;

    }


    try {

        const clone =
            source.cloneNode(
                true
            );


        clone.removeAttribute(
            "id"
        );


        clone.classList.add(
            "capture-clone"
        );


        /*
        กำหนดความกว้างขั้นต่ำ
        เพื่อไม่ให้ Capture จากมือถือ
        แล้วรายงานบีบจนอ่านยาก
        */

        clone.style.width =
            Math.max(

                source.scrollWidth,

                1200

            ) +
            "px";


        clone.style.maxWidth =
            "none";


        clone.style.height =
            "auto";


        clone.style.maxHeight =
            "none";


        clone.style.overflow =
            "visible";


        /*
        ขยายทุก Scroll Container
        */

        clone
            .querySelectorAll(
                ".table-scroll"
            )
            .forEach(

                element => {

                    element.style.width =
                        "max-content";

                    element.style.maxWidth =
                        "none";

                    element.style.height =
                        "auto";

                    element.style.maxHeight =
                        "none";

                    element.style.overflow =
                        "visible";

                }

            );


        /*
        ขยาย Table
        */

        clone
            .querySelectorAll(
                "table"
            )
            .forEach(

                table => {

                    table.style.width =
                        "max-content";

                    table.style.maxWidth =
                        "none";

                }

            );


        /*
        ถ้าเป็น Production Output
        Canvas ที่ Clone จะไม่เก็บภาพ Chart
        จึงเปลี่ยน Canvas เป็นรูปก่อน
        */

        const originalCanvases =
            source.querySelectorAll(
                "canvas"
            );


        const clonedCanvases =
            clone.querySelectorAll(
                "canvas"
            );


        originalCanvases.forEach(

            (
                originalCanvas,
                index
            ) => {

                const clonedCanvas =
                    clonedCanvases[index];


                if (!clonedCanvas) return;


                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    originalCanvas.toDataURL(
                        "image/png"
                    );


                image.style.width =
                    originalCanvas.clientWidth +
                    "px";


                image.style.height =
                    originalCanvas.clientHeight +
                    "px";


                image.style.display =
                    "block";


                clonedCanvas.replaceWith(
                    image
                );

            }

        );


        document.body.appendChild(
            clone
        );


        /*
        รอ Font / Layout
        */

        await new Promise(

            resolve =>

                setTimeout(
                    resolve,
                    250
                )

        );


        const canvas =
            await html2canvas(

                clone,

                {

                    backgroundColor:
                        "#ffffff",

                    scale:
                        2,

                    useCORS:
                        true,

                    logging:
                        false,

                    width:
                        clone.scrollWidth,

                    height:
                        clone.scrollHeight,

                    windowWidth:
                        clone.scrollWidth,

                    windowHeight:
                        clone.scrollHeight

                }

            );


        const link =
            document.createElement(
                "a"
            );


        link.download =

            filePrefix +

            "_" +

            getFileDateTime() +

            ".png";


        link.href =
            canvas.toDataURL(
                "image/png"
            );


        link.click();


        clone.remove();

    }

    catch (error) {

        console.error(
            "Save Image Error:",
            error
        );


        alert(

            "ไม่สามารถบันทึกภาพได้\n" +

            error.message

        );


        document
            .querySelectorAll(
                ".capture-clone"
            )
            .forEach(

                element =>
                    element.remove()

            );

    }

}

/* =========================================================
   REFRESH STATE
========================================================= */

function setRefreshState(isRefreshing) {

    if (isRefreshing) {

        setConnectionState("loading");

    } else {

        setConnectionState("live");

    }

}


/* =========================================================
   UPDATE LAST UPDATED TIME
========================================================= */

function updateLastUpdatedTime() {

    setConnectionState("live");

    updateDataStatus();

}


/* =========================================================
   DASHBOARD ERROR
========================================================= */

function showDashboardError(message) {

    setConnectionState("error");

    console.error(
        "DASHBOARD ERROR:",
        message
    );

}
/* =========================================================
   CONNECTION STATE
========================================================= */

function setConnectionState(
    state
) {

    const status =
        document.getElementById(
            "connectionStatus"
        );


    const text =
        document.getElementById(
            "connectionText"
        );


    if (
        !status ||
        !text
    ) {

        return;

    }


    status.classList.remove(
        "connection-error"
    );


    if (
        state ===
        "error"
    ) {

        status.classList.add(
            "connection-error"
        );


        text.textContent =
            "OFFLINE";

        return;

    }


    if (
        state ===
        "loading"
    ) {

        text.textContent =
            "CONNECTING";

        return;

    }


    text.textContent =
        "LIVE";

}


/* =========================================================
   DATA STATUS
========================================================= */

function updateDataStatus() {

    const now =
        new Date();


    setText(

        "dataStatus",

        "Live data updated: " +

        now.toLocaleString(
            "th-TH",
            {
                dateStyle:
                    "medium",

                timeStyle:
                    "medium"
            }
        )

    );


    setText(

        "footerStatus",

        "Production Monitor Dashboard · Last update " +

        now.toLocaleTimeString(
            "th-TH"
        )

    );

}


/* =========================================================
   STATUS BADGE
========================================================= */

function createStatusBadge(
    status
) {

    const text =
        displayValue(
            status
        );


    let className =
        "status-waiting";


    if (
        status ===
        "กำลังดำเนินงาน"
    ) {

        className =
            "status-running";

    }


    else if (
        TROUBLE_STATUS.includes(
            status
        )
    ) {

        className =
            "status-trouble";

    }


    else if (
        status ===
        "เสร็จสิ้น"
    ) {

        className =
            "status-finished";

    }


    return `

        <span
            class="
                status-badge
                ${className}
            "
        >

            ${escapeHtml(
                text
            )}

        </span>

    `;

}


/* =========================================================
   TYPE BADGE
========================================================= */

function createTypeBadge(
    type
) {

    const normalized =
        normalizeJobType(
            type
        );


    let className =
        "type-unknown";


    if (
        normalized ===
        "NORMAL"
    ) {

        className =
            "type-normal";

    }


    else if (
        normalized ===
        "REWORK"
    ) {

        className =
            "type-rework";

    }


    return `

        <span
            class="
                type-badge
                ${className}
            "
        >

            ${escapeHtml(
                displayValue(
                    normalized
                )
            )}

        </span>

    `;

}


/* =========================================================
   DATE FILTER
========================================================= */

function isDateInRange(
    value,
    start,
    end
) {

    const date =
        parseDate(
            value
        );


    if (!date) {

        return false;

    }


    if (
        start &&
        date < start
    ) {

        return false;

    }


    if (
        end &&
        date > end
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   PARSE DATE
========================================================= */

function parseDate(
    value
) {

    if (!value) {

        return null;

    }


    if (
        value instanceof Date &&
        !isNaN(
            value.getTime()
        )
    ) {

        return value;

    }


    /*
    ISO / Standard Date
    */

    const direct =
        new Date(
            value
        );


    if (
        !isNaN(
            direct.getTime()
        )
    ) {

        return direct;

    }


    /*
    รองรับ dd/MM/yyyy HH:mm
    */

    const text =
        String(
            value
        ).trim();


    const match =
        text.match(

            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/

        );


    if (match) {

        let year =
            Number(
                match[3]
            );


        /*
        ถ้า API ส่ง พ.ศ.
        */

        if (
            year > 2400
        ) {

            year -=
                543;

        }


        const date =
            new Date(

                year,

                Number(
                    match[2]
                ) - 1,

                Number(
                    match[1]
                ),

                Number(
                    match[4] || 0
                ),

                Number(
                    match[5] || 0
                ),

                Number(
                    match[6] || 0
                )

            );


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date;

        }

    }


    return null;

}


/* =========================================================
   THAI DATE TIME
========================================================= */

function formatThaiDateTime(
    value
) {

    const date =
        parseDate(
            value
        );


    if (!date) {

        return "—";

    }


    return date.toLocaleString(

        "th-TH",

        {

            day:
                "2-digit",

            month:
                "long",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false

        }

    ) +
    " น.";

}


/* =========================================================
   RANGE LABEL
========================================================= */

function createRangeLabel(
    start,
    end
) {

    if (
        !start ||
        !end
    ) {

        return "ทุกช่วงเวลา";

    }


    return (

        formatThaiDateOnly(
            start
        )

        +

        " ถึง "

        +

        formatThaiDateOnly(
            end
        )

    );

}


/* =========================================================
   THAI DATE ONLY
========================================================= */

function formatThaiDateOnly(
    value
) {

    const date =
        parseDate(
            value
        );


    if (!date) {

        return "—";

    }


    return date.toLocaleDateString(

        "th-TH",

        {

            day:
                "2-digit",

            month:
                "long",

            year:
                "numeric"

        }

    );

}


/* =========================================================
   CHART DATE
========================================================= */

function formatChartDate(
    value
) {

    const date =
        parseDate(
            value
        );


    if (!date) {

        return value;

    }


    return date.toLocaleDateString(

        "th-TH",

        {

            day:
                "2-digit",

            month:
                "short"

        }

    );

}


/* =========================================================
   DATE HELPERS
========================================================= */

function startOfDay(
    value
) {

    const date =
        new Date(
            value
        );


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


function endOfDay(
    value
) {

    const date =
        new Date(
            value
        );


    date.setHours(
        23,
        59,
        59,
        999
    );


    return date;

}


/* =========================================================
   DATE INPUT VALUE
========================================================= */

function toDateInputValue(
    value
) {

    const date =
        new Date(
            value
        );


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return (

        year +
        "-" +
        month +
        "-" +
        day

    );

}


/* =========================================================
   DURATION CLOCK
========================================================= */

function formatDurationClock(
    milliseconds
) {

    const totalSeconds =
        Math.floor(

            milliseconds /
            1000

        );


    const hours =
        Math.floor(

            totalSeconds /
            3600

        );


    const minutes =
        Math.floor(

            (
                totalSeconds %
                3600
            ) /
            60

        );


    const seconds =
        totalSeconds %
        60;


    return [

        String(
            hours
        )
        .padStart(
            2,
            "0"
        ),

        String(
            minutes
        )
        .padStart(
            2,
            "0"
        ),

        String(
            seconds
        )
        .padStart(
            2,
            "0"
        )

    ]
    .join(":");

}


/* =========================================================
   NUMBER
========================================================= */

function toNumber(
    value
) {

    const number =
        Number(

            String(
                value ?? 0
            )
            .replace(
                /,/g,
                ""
            )
            .replace(
                /[^0-9.\-]/g,
                ""
            )

        );


    return isNaN(
        number
    )
        ? 0
        : number;

}


function formatNumber(
    value
) {

    return toNumber(
        value
    )
    .toLocaleString(

        "th-TH",

        {

            maximumFractionDigits:
                2

        }

    );

}


/* =========================================================
   DISPLAY VALUE
========================================================= */

function displayValue(
    value
) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return "—";

    }


    return String(
        value
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) return;


    element.textContent =
        value;

}


/* =========================================================
   INPUT HELPERS
========================================================= */

function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) return;


    element.value =
        value;

}


function getInputValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value
        : "";

}


/* =========================================================
   FILE DATE TIME
========================================================= */

function getFileDateTime() {

    const now =
        new Date();


    const date =
        toDateInputValue(
            now
        )
        .replace(
            /-/g,
            ""
        );


    const time =

        String(
            now.getHours()
        )
        .padStart(
            2,
            "0"
        )

        +

        String(
            now.getMinutes()
        )
        .padStart(
            2,
            "0"
        )

        +

        String(
            now.getSeconds()
        )
        .padStart(
            2,
            "0"
        );


    return (

        date +
        "_" +
        time

    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}
/* =========================================================
   INITIALIZE DEFAULT DATE RANGES
========================================================= */

function initializeDefaultDateRanges() {

    [
        "output",
        "trouble",
        "finished"
    ]
    .forEach(

        report => {

            setDateRange(
                report,
                "month"
            );

            setActiveFilterButton(
                report,
                "month"
            );

        }

    );

}
/* =========================================================
   SIMPLE LOGIN
========================================================= */


/* เปลี่ยนรหัสผ่านตรงนี้ */

const SIMPLE_LOGIN_PASSWORD =
    "8888";


/* =========================================================
   INITIALIZE LOGIN
========================================================= */

function initializeSimpleLogin() {

    const loginScreen =
        document.getElementById(
            "loginScreen"
        );


    const loginForm =
        document.getElementById(
            "loginForm"
        );


    const passwordInput =
        document.getElementById(
            "loginPassword"
        );


    const loginError =
        document.getElementById(
            "loginError"
        );


    const togglePassword =
        document.getElementById(
            "togglePassword"
        );


    if (
        !loginScreen ||
        !loginForm ||
        !passwordInput
    ) {

        return;

    }


    /* =====================================================
       CHECK EXISTING LOGIN
    ===================================================== */

    const isLoggedIn =
        sessionStorage.getItem(
            "pvcDashboardLoggedIn"
        );


    if (
        isLoggedIn === "true"
    ) {

        loginScreen.classList.add(
            "is-hidden"
        );

    }


    else {

        loginScreen.classList.remove(
            "is-hidden"
        );


        setTimeout(
            () => {

                passwordInput.focus();

            },
            100
        );

    }


    /* =====================================================
       LOGIN
    ===================================================== */

    loginForm.addEventListener(

        "submit",

        event => {

            event.preventDefault();


            const enteredPassword =
                String(
                    passwordInput.value || ""
                );


            if (
                enteredPassword ===
                SIMPLE_LOGIN_PASSWORD
            ) {

                sessionStorage.setItem(
                    "pvcDashboardLoggedIn",
                    "true"
                );


                loginError.textContent =
                    "";


                loginScreen.classList.add(
                    "is-hidden"
                );


                passwordInput.value =
                    "";

            }


            else {

                loginError.textContent =
                    "รหัสผ่านไม่ถูกต้อง";


                passwordInput.value =
                    "";


                passwordInput.focus();

            }

        }

    );


    /* =====================================================
       SHOW / HIDE PASSWORD
    ===================================================== */

    if (togglePassword) {

        togglePassword.addEventListener(

            "click",

            () => {

                const isPassword =
                    passwordInput.type ===
                    "password";


                passwordInput.type =
                    isPassword
                        ? "text"
                        : "password";


                togglePassword.textContent =
                    isPassword
                        ? "🙈"
                        : "👁";

            }

        );

    }

}


/* =========================================================
   START LOGIN
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    initializeSimpleLogin

);
const LOGIN_PASSWORD = "8888";

function startSystem() {

    startClock();

    bindEvents();

    initializeDefaultDateRanges();

    loadDashboardData();

    startAutoRefresh();

}

function initializeLogin() {

    const login =
        document.getElementById("loginScreen");

    const password =
        document.getElementById("loginPassword");

    const form =
        document.getElementById("loginForm");

    const error =
        document.getElementById("loginError");

    if (
        !login ||
        !password ||
        !form
    ) {

        console.error(
            "Login screen not found."
        );

        return;

    }

    login.style.display = "flex";

    form.addEventListener(

        "submit",

        e => {

            e.preventDefault();

            if (
                password.value ===
                LOGIN_PASSWORD
            ) {

                login.style.display = "none";

                startSystem();

            }

            else {

                error.textContent =
                    "รหัสผ่านไม่ถูกต้อง";

                password.value = "";

                password.focus();

            }

        }

    );

}