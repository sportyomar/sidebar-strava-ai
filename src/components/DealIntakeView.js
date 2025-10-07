import React, {useState, useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';

import {
    getAllDeals,
    getDealsByStatus,
    getDealsByOwner,
    getActiveDeals,
    dealStatuses,
    dealSectors,
    dealSources,
    dealPriorities,
    dealSellerTypes,
    dealDateAddedOptions,
    parseRange,
} from "../data/dealIntakeData";


function DealIntakeView({mode, currentUser = "Sarah Johnson", module = "dealIntake"}) {
    const [deals, setDeals]  = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [viewFilter, setViewFilter] = useState('All'); // All | My Deals | Active Only
    const [sectorFilter, setSectorFilter] = useState('');
    const [availableSectors, setAvailableSectors] = useState(dealSectors);
    const [availableStatuses, setAvailableStatuses] = useState(dealStatuses);
    const [searchParams, setSearchParams] = useSearchParams();
    const [sourceFilter, setSourceFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [sellerTypeFilter, setSellerTypeFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [revenueMin, setRevenueMin] = useState('');
    const [revenueMax, setRevenueMax] = useState('');
    const [ebitdaMin, setEbitdaMin] = useState('');
    const [ebitdaMax, setEbitdaMax] = useState('');



    // useEffect(() => {
    //     const intakeDeals = getAllDeals();
    //     setDeals(intakeDeals);
    // }, []);

    // useEffect(() => {
    //     const intakeDeals = filterStatus
    //     ? getDealsByStatus(filterStatus)
    //         : getAllDeals();
    //
    //     setDeals(intakeDeals);
    // }, [filterStatus]);

    // Step 1: READ URL into local state (on component mount or URL change)
    // Restore filters from URL on load
    useEffect(()=> {
        // replaced by 'All'
        // const urlView = searchParams.get('view');
        // const urlStatus = searchParams.get('status');
        // const urlSector = searchParams.get('sector');

        const urlView = searchParams.get('view') || 'All';
        const urlStatus = searchParams.get('status') || 'All';
        const urlSector = searchParams.get('sector') || 'All';
        const urlSource = searchParams.get('source') || 'All';
        const urlPriority = searchParams.get('priority') || 'All';
        const urlSeller = searchParams.get('seller') || 'All';
        const urlDateFrom = searchParams.get('dateFrom') || '';
        const urlDateTo = searchParams.get('dateTo') || '';
        const urlRevMin = searchParams.get('revMin') || '';
        const urlRevMax = searchParams.get('revMax') || '';
        const urlEbitdaMin = searchParams.get('ebitdaMin') || '';
        const urlEbitdaMax = searchParams.get('ebitdaMax') || '';

        // replaced by 'All'
        // if (urlView) setViewFilter(urlView);
        // if (urlStatus) setFilterStatus(urlStatus);
        // if (urlSector) setSectorFilter(urlSector);

        setViewFilter(urlView);
        setFilterStatus(urlStatus);
        setSectorFilter(urlSector);
        setSourceFilter(urlSource);
        setPriorityFilter(urlPriority);
        setSellerTypeFilter(urlSeller);
        setDateFrom(urlDateFrom);
        setDateTo(urlDateTo);
        setRevenueMin(urlRevMin);
        setRevenueMax(urlRevMax);
        setEbitdaMin(urlEbitdaMin);
        setEbitdaMax(urlEbitdaMax);


    }, [searchParams]);

    // Step 2: WRITE local state back into URL
    useEffect(() => {
        const newParams = new URLSearchParams();

        let filteredDeals = getAllDeals();

        // Step 1: "View" Filter
        if (viewFilter === "My Deals") {
            filteredDeals = getDealsByOwner(currentUser);
        } else if (viewFilter === 'Active Only') {
            filteredDeals = getActiveDeals();
        }

        // Step 2: Status Filter
        if (filterStatus !== 'All') {
            filteredDeals = filteredDeals.filter(deal => deal.status === filterStatus);
        }

        // Step 3: Sector Filter
        if (sectorFilter !== 'All') {
            filteredDeals = filteredDeals.filter(deal => deal.sector === sectorFilter);
        }

        // Step 4: Source Filter
        if (sourceFilter !== 'All') {
          filteredDeals = filteredDeals.filter(deal => deal.source === sourceFilter);
        }

        // Step 5: Priority Filter
        if (priorityFilter !== 'All') {
          filteredDeals = filteredDeals.filter(deal => deal.priority === priorityFilter);
        }

        // Step 6: Seller Type Filter
        if (sellerTypeFilter !== 'All') {
          filteredDeals = filteredDeals.filter(deal => deal.sellerType === sellerTypeFilter);
        }

        // Step 7: Date Filter
        if (dateFrom && dateTo) {
          filteredDeals = filteredDeals.filter(deal =>
            deal.dateAdded >= dateFrom && deal.dateAdded <= dateTo
          );
        }

        // Step 8: Revenue Filter
        if (revenueMin || revenueMax) {
          filteredDeals = filteredDeals.filter(deal => {
            const [min, max] = parseRange(deal.revenueRange);
            return (!revenueMin || min >= revenueMin) && (!revenueMax || max <= revenueMax);
          });
        }

        // Step 9: EBITDA Filter
        if (ebitdaMin || ebitdaMax) {
          filteredDeals = filteredDeals.filter(deal => {
            const [min, max] = parseRange(deal.ebitdaRange);
            return (!ebitdaMin || min >= ebitdaMin) && (!ebitdaMax || max <= ebitdaMax);
          });
        }


        // Apply filtered deals to state
        setDeals(filteredDeals);

        // Extract available statuses and sectors from current filtered set
        const uniqueStatuses = [...new Set(filteredDeals.map(deal=> deal.status))];
        const uniqueSectors = [...new Set(filteredDeals.map(deal=> deal.sector))];

        // Sort alphabetically
        setAvailableStatuses(uniqueStatuses.sort());
        setAvailableSectors(uniqueSectors.sort());

        // replaced by 'All'
        // if (viewFilter) newParams.set('view', viewFilter); else newParams.delete('view');
        // if (filterStatus) newParams.set('status', filterStatus); else newParams.delete('status');
        // if (sectorFilter) newParams.set('sector', sectorFilter); else newParams.delete('sector');


        // Sync values from the filters with the URL so that they persist  on refresh
        newParams.set('view', viewFilter || 'All');
        newParams.set('status', filterStatus || 'All');
        newParams.set('sector', sectorFilter || 'All');
        newParams.set('mode', mode || 'All');
        newParams.set('module', module || 'dealIntake');
        newParams.set('source', sourceFilter || 'All');
        newParams.set('priority', priorityFilter || 'All');
        newParams.set('seller', sellerTypeFilter || 'All');
        newParams.set('dateFrom', dateFrom);
        newParams.set('dateTo', dateTo);
        newParams.set('revMin', revenueMin || '');
        newParams.set('revMax', revenueMax || '');
        newParams.set('ebitdaMin', ebitdaMin || '');
        newParams.set('ebitdaMax', ebitdaMax || '');


        const currentParamsString = searchParams.toString();
        const newParamsString = newParams.toString();

        if (currentParamsString !== newParamsString) {
            setSearchParams(newParams);
        }

    //     add filters to the dependency of the useEffect in order for the filtering functionality to work
    }, [filterStatus, viewFilter, sectorFilter, currentUser, setSearchParams, mode, module, sourceFilter, priorityFilter, sellerTypeFilter, dateFrom, dateTo, revenueMin, revenueMax, ebitdaMin, ebitdaMax]);

    return (
        <>
            <h2>Deal Intake</h2>
            <p>Welcome to Deal Intake module</p>
            <p> Mode: {mode}</p>
            <p>Viewing as: <strong>{currentUser}</strong></p>

            <label>View:</label>
            <select value={viewFilter} onChange={(e)=> setViewFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="My Deals">My Deals</option>
                <option value="Active Only">Active Only</option>
            </select>

            <label>Status Filter:</label>
            <select value={filterStatus} onChange={(e) =>setFilterStatus(e.target.value)}>
                <option value="All">All</option>
                {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>


            <label>Sector:</label>
            <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
              <option value="All">All</option>
              {availableSectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>

            <label>Source:</label>
            <select value={sourceFilter} onChange={(e)=> setSourceFilter(e.target.value)}>
                <option value="All">All</option>
                {dealSources.map(source => (
                    <option key={source} value={source}>{source}</option>
                ))}
            </select>

            <label>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">All</option>
                {dealPriorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                ))}
            </select>

            <label>Seller Type</label>
            <select value={sellerTypeFilter} onChange={(e) => setSellerTypeFilter(e.target.value)}>
                <option value="All">All</option>
                {dealSellerTypes.map(type=> (
                    <option value={type} key={type}>{type}</option>
                ))}
            </select>

            <label>Date Added (From)</label>
            <input
                type="date"
                value={dateFrom}
                onChange={(e)=> setDateFrom(e.target.value)}
            />

            <label>Date Added (To)</label>
            <input
                type="date"
                value={dateTo}
                onChange={(e)=> setDateTo(e.target.value)}
            />

            <label>Revenue Range (in $M):</label>
            <input
                type="number"
                placeholder="Min"
                value={revenueMin}
                onChange={(e)=> setRevenueMin(e.target.value)}
            />
            <input
                type="number"
                placeholder="Max"
                value={revenueMax}
                onChange={(e)=> setRevenueMax(e.target.value)}
            />

            <label>EBITDA Range (in $M):</label>
            <input
                type="number"
                placeholder="Min"
                value={ebitdaMin}
                onChange={(e)=> setEbitdaMin(e.target.value)}
            />
            <input
                type="number"
                placeholder="Max"
                value={ebitdaMax}
                onChange={(e)=> setEbitdaMax(e.target.value)}
            />

            <div>
                {deals.map(deal => (
                    <div
                        key={deal.id}
                    >
                        <h3>{deal.dealName}</h3>
                        <p><strong>Date:</strong>{deal.dateAdded}</p>
                        <p><strong>Sector:</strong>{deal.sector}</p>
                        <p><strong>Owner:</strong>{deal.owner}</p>
                        <p><strong>Status:</strong>{deal.status}</p>
                        <p><strong>EV:</strong>{deal.estimatedEV}</p>
                        <p><strong>Source:</strong>{deal.source}</p>
                        <p><strong>Priority:</strong>{deal.priority}</p>
                        <p><strong>Seller Type:</strong>{deal.sellerType}</p>
                    </div>
                ))}
            </div>
        </>
    )
}

export default DealIntakeView;